//! Transcript parsing for the `fetch_transcript` command.
//!
//! This mirrors `lib/youtube/transcript-provider.ts`: yt-dlp is asked for
//! `--sub-format json3`, which yields YouTube's JSON3 shape
//! (`events[].{tStartMs, dDurationMs, segs[].utf8}`). We parse that into
//! `TranscriptSegment`s and apply a sentence-merge that is the Rust equivalent
//! of `mergeIntoSentences` — small gaps between lines that do not end a
//! sentence are joined so the UI gets sentence-sized chunks.

use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
pub struct TranscriptSegment {
    pub start_time: f64,
    pub end_time: f64,
    pub text: String,
}

#[derive(Debug, Clone)]
struct RawSeg {
    start: f64,
    duration: f64,
    text: String,
}

const ABBREVIATIONS: &[&str] = &[
    "dr", "mr", "mrs", "ms", "vs", "etc", "inc", "ltd", "jr", "sr", "prof", "dept", "est", "gov",
    "st", "ave", "blvd", "rd",
];

const TLD_EXT: &[&str] = &[
    "com", "org", "net", "edu", "gov", "io", "ai", "co", "uk", "txt", "pdf", "js", "ts", "jsx",
    "tsx", "html", "css", "json", "png", "jpg", "jpeg", "gif", "svg", "mp4", "mp3", "wav",
];

pub fn parse_json3(content: &str) -> Vec<TranscriptSegment> {
    let v: Value = match serde_json::from_str(content) {
        Ok(v) => v,
        Err(_) => return Vec::new(),
    };
    let events = match v.get("events").and_then(|e| e.as_array()) {
        Some(e) => e,
        None => return Vec::new(),
    };

    let mut raw: Vec<RawSeg> = Vec::new();
    for evt in events {
        let t_start_ms = evt.get("tStartMs").and_then(|x| x.as_i64()).unwrap_or(0);
        let d_ms = evt.get("dDurationMs").and_then(|x| x.as_i64()).unwrap_or(0);

        let text = evt
            .get("segs")
            .and_then(|s| s.as_array())
            .map(|segs| {
                segs.iter()
                    .filter_map(|s| s.get("utf8").and_then(|u| u.as_str()))
                    .collect::<Vec<_>>()
                    .join(" ")
            })
            .unwrap_or_default();

        let cleaned = clean_caption_text(&text);
        if !cleaned.is_empty() {
            raw.push(RawSeg {
                start: t_start_ms as f64 / 1000.0,
                duration: d_ms as f64 / 1000.0,
                text: cleaned,
            });
        }
    }

    merge_into_sentences(raw)
}

fn merge_into_sentences(segs: Vec<RawSeg>) -> Vec<TranscriptSegment> {
    if segs.is_empty() {
        return Vec::new();
    }

    const MAX_MERGE_GAP: f64 = 0.5;

    let mut merged: Vec<RawSeg> = Vec::new();
    let mut cur = segs[0].clone();

    for nxt in &segs[1..] {
        let cur_end = cur.start + cur.duration;
        let gap = nxt.start - cur_end;
        if gap <= MAX_MERGE_GAP && !ends_with_sentence(&cur.text) {
            cur.duration = (nxt.start + nxt.duration) - cur.start;
            cur.text = format!("{} {}", cur.text, nxt.text);
        } else {
            merged.push(std::mem::replace(&mut cur, nxt.clone()));
        }
    }
    merged.push(cur);

    merged
        .into_iter()
        .map(|s| TranscriptSegment {
            start_time: s.start,
            end_time: s.start + s.duration,
            text: s.text,
        })
        .collect()
}

fn ends_with_sentence(text: &str) -> bool {
    let trimmed = text.trim_end();
    if trimmed.is_empty() {
        return false;
    }
    let last = trimmed.chars().last().unwrap();
    if ['.', '!', '?', '。', '！', '？'].contains(&last) {
        if last == '.' {
            return is_sentence_ending_period(trimmed);
        }
        return true;
    }
    false
}

fn is_sentence_ending_period(text: &str) -> bool {
    let idx = text.len() - 1;
    let before = if idx > 0 {
        text[..idx].chars().last()
    } else {
        None
    };
    // decimal number like "3.14"
    if let Some(b) = before {
        if let Some(a) = text.get(idx + 1..idx + 2).and_then(|s| s.chars().next()) {
            if b.is_ascii_digit() && a.is_ascii_digit() {
                return false;
            }
        }
    }
    // abbreviation word before the dot
    let before_text = text[..idx].trim_end();
    let last_word = before_text.split_whitespace().last().unwrap_or("").to_lowercase();
    if ABBREVIATIONS.contains(&last_word.as_str()) {
        return false;
    }
    // TLD / file extension after the dot
    let after = text[idx + 1..].trim_start();
    let after_word = after
        .split_whitespace()
        .next()
        .unwrap_or("")
        .trim_matches(|c: char| !c.is_ascii_alphanumeric());
    if TLD_EXT.contains(&after_word.to_lowercase().as_str()) {
        return false;
    }
    true
}

fn clean_caption_text(raw: &str) -> String {
    decode_html(
        raw.replace('<', " ")
            .replace("&nbsp;", " ")
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" "),
    )
    .trim()
    .to_string()
}

fn decode_html(value: String) -> String {
    value
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
}
