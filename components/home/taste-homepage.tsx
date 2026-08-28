"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Bookmark,
  CalendarClock,
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageSquareText,
  NotebookPen,
  Pause,
  Play,
  Search,
} from "lucide-react";
import { VideoUrlInput } from "@/components/video-url-input";
import styles from "./taste-homepage.module.css";

gsap.registerPlugin(ScrollTrigger);

const TRANSCRIPT = [
  {
    time: "04:31",
    en: "Focus on systems, not only goals.",
    zh: "把注意力放在系统上，而不只是目标。",
    active: false,
  },
  {
    time: "04:37",
    en: "The system is what stays with you.",
    zh: "真正留下来的，是你反复使用的学习系统。",
    active: true,
  },
  {
    time: "04:44",
    en: "Make the next action obvious.",
    zh: "让下一步行动足够清晰。",
    active: false,
  },
] as const;

const LOOP_STEPS = [
  {
    title: "粘贴视频",
    description: "从一个链接开始，不必先注册。",
    detail: "字幕先出现，AI 结果随后补齐；等待时也能开始阅读。",
    meta: "公开视频链接",
  },
  {
    title: "对照字幕",
    description: "边看边读，每个要点都能跳回时间点。",
    detail: "原文、译文和播放器保持在同一个视野里，不丢失语境。",
    meta: "双语字幕 · 04:37",
  },
  {
    title: "保存并复习",
    description: "把重要词句放进明日复习，而不是看完就忘。",
    detail: "收藏内容保留原视频与时间点，复习时随时返回出处。",
    meta: "明日待复习 · 1",
  },
] as const;

const MARQUEE_ITEMS = [
  "双语字幕同步",
  "时间点可跳转",
  "回答引用原文",
  "保存词句与笔记",
  "明日复习",
] as const;

const TRACE_WORDS = [
  "先看原文，",
  "再看解释；",
  "先找到时间点，",
  "再相信答案。",
] as const;

const LEARNING_SCENARIOS = [
  {
    title: "英文访谈",
    intent: "我想看懂完整观点，而不是只记住几个片段。",
    outcome: "用双语字幕跟住上下文，把关键句保存到下一次复习。",
  },
  {
    title: "技术课程",
    intent: "我需要确认 AI 的解释有没有偏离讲者原意。",
    outcome: "从回答直接跳回引用字幕和时间点，自己完成最后判断。",
  },
  {
    title: "演讲复盘",
    intent: "我想把今天真正有用的内容留到明天。",
    outcome: "收藏词句、观点和笔记，让它们进入个人学习队列。",
  },
] as const;

const PROOF_ITEMS = [
  {
    icon: Captions,
    title: "双语字幕同步",
    description: "原文与译文按时间点对齐，阅读不会离开视频语境。",
  },
  {
    icon: Clock3,
    title: "要点带时间戳",
    description: "每个总结都能回到出处，不把模型生成当作事实来源。",
  },
  {
    icon: MessageSquareText,
    title: "问答引用原文",
    description: "回答显示引用片段和时间点，无法证实时明确说明。",
  },
  {
    icon: NotebookPen,
    title: "笔记进入复习",
    description: "保存的词句进入个人学习队列，第二天继续巩固。",
  },
] as const;

type PreviewTab = "transcript" | "summary" | "review";
const DEMO_VIDEO_ID = "eIho2S0ZahI";

export function TasteHomepage() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-hero-copy] > *",
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.09,
            ease: "power3.out",
          },
        );

        gsap.fromTo(
          "[data-workspace-preview]",
          { autoAlpha: 0, y: 44, scale: 0.965 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 1,
            delay: 0.18,
            ease: "power3.out",
          },
        );

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.fromTo(
            element,
            { autoAlpha: 0, y: 36 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.75,
              ease: "power3.out",
              scrollTrigger: {
                trigger: element,
                start: "top 86%",
                once: true,
              },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-proof-card]").forEach((card, index) => {
          gsap.fromTo(
            card,
            { autoAlpha: 0, y: 70, rotateX: 4 },
            {
              autoAlpha: 1,
              y: 0,
              rotateX: 0,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: card,
                start: "top 88%",
                end: "top 42%",
                scrub: 0.55,
              },
              delay: index * 0.04,
            },
          );
        });

        gsap.fromTo(
          "[data-trace-word]",
          { opacity: 0.14 },
          {
            opacity: 1,
            stagger: 0.16,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-trace-copy]",
              start: "top 82%",
              end: "bottom 48%",
              scrub: 0.7,
            },
          },
        );
      });

      media.add("(min-width: 993px) and (prefers-reduced-motion: no-preference)", () => {
        ScrollTrigger.create({
          trigger: "[data-proof-section]",
          endTrigger: "[data-proof-stack]",
          start: "top 96px",
          end: "bottom bottom-=96",
          pin: "[data-proof-intro]",
          pinSpacing: false,
        });
      });

      return () => media.revert();
    },
    { scope },
  );

  return (
    <main ref={scope} id="main-content" className={styles.page}>
      <a href="#main-content" className={styles.skipLink}>
        跳到主要内容
      </a>

      <section id="product" className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-hero-copy>
            <h1>
              <span>把一条视频，</span>
              <span>变成真正学会的内容</span>
            </h1>
            <p className={styles.heroDescription}>
              粘贴 YouTube 链接，获得双语字幕、可追溯要点和下一次复习。
            </p>
            <VideoUrlInput
              variant="editorial"
              submitLabel="开始学习"
              placeholder="粘贴 YouTube 视频链接"
              className={`${styles.heroForm} tp-video-url-form`}
            />
            <Link href={`/video/${DEMO_VIDEO_ID}`} className={styles.exampleLink}>
              用 TED 演讲试用
              <ArrowRight aria-hidden size={17} />
            </Link>
          </div>

          <WorkspacePreview />
        </div>
      </section>

      <section className={styles.capabilityBand} aria-label="Teach Player 学习能力">
        <div className={styles.marqueeTrack}>
          {[0, 1].map((copy) => (
            <div key={copy} className={styles.marqueeGroup} aria-hidden={copy === 1}>
              {MARQUEE_ITEMS.map((item) => (
                <span key={`${copy}-${item}`}>
                  {item}
                  <i aria-hidden />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.loopSection} aria-labelledby="loop-title">
        <div className={styles.loopHeading} data-reveal>
          <h2 id="loop-title">
            不是看完，
            <br />
            是留下来
          </h2>
          <p>Teach Player 把观看变成一个可以继续的学习循环。</p>
        </div>

        <div className={styles.loopRail} data-reveal>
          {LOOP_STEPS.map((step, index) => (
            <article
              key={step.title}
              className={styles.loopStep}
              tabIndex={0}
              aria-label={`${step.title}：${step.description}`}
            >
              <div className={styles.stepTopline}>
                <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
                {index < LOOP_STEPS.length - 1 ? (
                  <ArrowRight className={styles.stepArrow} aria-hidden size={22} />
                ) : null}
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <p className={styles.stepDetail}>{step.detail}</p>
              <div className={styles.stepMeta}>
                {index === 0 ? <Play aria-hidden size={15} /> : null}
                {index === 1 ? <Captions aria-hidden size={15} /> : null}
                {index === 2 ? <CalendarClock aria-hidden size={15} /> : null}
                {step.meta}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className={styles.proofSection}
        aria-labelledby="proof-title"
        data-proof-section
      >
        <div className={styles.proofIntro} data-proof-intro>
          <h2 id="proof-title">每个答案，都能回到视频</h2>
          <p>
            AI 可以帮你理解，但不能代替出处。字幕、要点、问答和笔记都围绕原视频组织。
          </p>
          <p
            className={styles.traceStatement}
            data-trace-copy
            aria-label={TRACE_WORDS.join("")}
          >
            {TRACE_WORDS.map((words) => (
              <span key={words} data-trace-word aria-hidden>
                {words}
              </span>
            ))}
          </p>
          <Link href="/explore" className={styles.textAction}>
            浏览学习视频
            <ArrowRight aria-hidden size={17} />
          </Link>
        </div>

        <div className={styles.proofStack} data-proof-stack>
          <article className={styles.proofCard} data-proof-card>
            <div className={styles.citationTopline}>
              <span>AI 回答</span>
              <span className={styles.citationState}>
                <Check aria-hidden size={14} />
                已找到 2 条原文
              </span>
            </div>
            <p className={styles.answerText}>
              视频建议把目标改写成可重复的系统，因为系统决定你每天实际采取的行动。
            </p>
            <div className={styles.citationButton} aria-label="界面示例引用">
              <span>04:37</span>
              “The system is what stays with you.”
              <span>界面示例</span>
            </div>
          </article>

          <article className={styles.proofCard} data-proof-card>
            <div className={styles.reviewTopline}>
              <span>明日复习</span>
              <span>1 个学习项</span>
            </div>
            <div className={styles.savedItem}>
              <Bookmark aria-hidden size={18} />
              <div>
                <strong>The system is what stays with you.</strong>
                <span>真正留下来的，是你反复使用的系统。</span>
              </div>
              <span className={styles.savedTime}>04:37</span>
            </div>
          </article>

          <div className={styles.proofList} data-proof-card>
            {PROOF_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={styles.proofItem}>
                  <Icon aria-hidden size={19} />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.scenarioSection} aria-labelledby="scenario-title">
        <div className={styles.scenarioHeading} data-reveal>
          <h2 id="scenario-title">把不同的视频，变成同一个学习习惯</h2>
          <p>这里展示的是学习意图，不是虚构的用户评价。</p>
        </div>

        <LearningScenarioCarousel />
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div className={styles.finalCtaInner} data-reveal>
          <h2 id="final-cta-title">选一条你真的想学的视频</h2>
          <p>从一个链接开始。先获得字幕，再决定哪些内容值得保存。</p>
          <VideoUrlInput
            variant="editorial"
            submitLabel="开始学习"
            placeholder="粘贴 YouTube 视频链接"
            className={`${styles.finalForm} tp-video-url-form`}
          />
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Teach Player</p>
        <nav className={styles.footerPending} aria-label="政策与支持">
          <Link href="/privacy">隐私</Link>
          <Link href="/terms">条款</Link>
          <Link href="/support">支持</Link>
        </nav>
      </footer>
    </main>
  );
}

function LearningScenarioCarousel() {
  const [scenarioIndex, setScenarioIndex] = useState(0);

  return (
    <div className={styles.scenarioCarousel} data-reveal aria-live="polite">
          <div className={styles.scenarioTopline}>
            <span>{LEARNING_SCENARIOS[scenarioIndex].title}</span>
            <span>
              {String(scenarioIndex + 1).padStart(2, "0")} / {String(LEARNING_SCENARIOS.length).padStart(2, "0")}
            </span>
          </div>
          <blockquote>“{LEARNING_SCENARIOS[scenarioIndex].intent}”</blockquote>
          <p>{LEARNING_SCENARIOS[scenarioIndex].outcome}</p>
          <div className={styles.scenarioControls}>
            <button
              type="button"
              aria-label="上一个学习场景"
              onClick={() =>
                setScenarioIndex((current) =>
                  current === 0 ? LEARNING_SCENARIOS.length - 1 : current - 1,
                )
              }
            >
              <ChevronLeft aria-hidden size={20} />
            </button>
            <button
              type="button"
              aria-label="下一个学习场景"
              onClick={() =>
                setScenarioIndex((current) => (current + 1) % LEARNING_SCENARIOS.length)
              }
            >
              <ChevronRight aria-hidden size={20} />
            </button>
          </div>
        </div>
  );
}

function WorkspacePreview() {
  const [tab, setTab] = useState<PreviewTab>("transcript");
  const [playing, setPlaying] = useState(false);

  return (
    <div className={`${styles.workspace} tp-demo-workspace`} data-workspace-preview>
      <div className={styles.workspaceHeader}>
        <div>
          <span className={styles.statusDot} aria-hidden />
          界面示例 · How to Learn Anything
        </div>
        <span>16:24</span>
      </div>

      <div className={`${styles.workspaceBody} tp-demo-body`}>
        <div className={`${styles.videoColumn} tp-demo-video-column`}>
          <div className={`${styles.videoFrame} tp-demo-video`} role="img" aria-label="知识视频播放预览">
            <div className={styles.videoShade} aria-hidden />
            <button
              type="button"
              className={styles.playButton}
              aria-label={playing ? "暂停示例视频" : "播放示例视频"}
              aria-pressed={playing}
              onClick={() => setPlaying((current) => !current)}
            >
              {playing ? (
                <Pause aria-hidden size={18} fill="currentColor" />
              ) : (
                <Play aria-hidden size={18} fill="currentColor" />
              )}
            </button>
            <div className={styles.videoProgress} aria-hidden>
              <span />
            </div>
            <span className={styles.videoTime}>04:37 / 16:24</span>
          </div>

          <div className={`${styles.summaryPanel} tp-demo-summary`}>
            <span>AI 要点</span>
            <p>把目标转化为每天可重复的系统，让下一步行动足够清晰。</p>
          </div>
        </div>

        <div className={`${styles.studyColumn} tp-demo-study-column`}>
          <div className={`${styles.previewTabs} tp-preview-tabs`} role="tablist" aria-label="学习内容预览">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "transcript"}
              className="tp-preview-tab"
              onClick={() => setTab("transcript")}
            >
              字幕
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "summary"}
              className="tp-preview-tab"
              onClick={() => setTab("summary")}
            >
              摘要
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "review"}
              className="tp-preview-tab"
              onClick={() => setTab("review")}
            >
              复习
            </button>
            <Search aria-hidden size={16} />
          </div>

          {tab === "transcript" ? (
            <div className={`${styles.transcriptList} tp-transcript-list`} role="tabpanel">
              {TRANSCRIPT.map((line) => (
                <button
                  type="button"
                  key={line.time}
                  data-current={line.active ? "true" : "false"}
                  aria-label={`${line.time}，${line.en}，${line.zh}`}
                  className={`${line.active ? styles.transcriptActive : styles.transcriptLine} tp-transcript-row`}
                >
                  <span className="tp-transcript-time">{line.time}</span>
                  <span className="tp-transcript-copy">
                    <strong className="tp-transcript-source">{line.en}</strong>
                    <small className="tp-transcript-translation">{line.zh}</small>
                  </span>
                  {line.active ? <Bookmark aria-hidden size={15} /> : null}
                </button>
              ))}
            </div>
          ) : null}

          {tab === "summary" ? (
            <div className={styles.previewState} role="tabpanel">
              <Clock3 aria-hidden size={20} />
              <strong>三个可追溯要点</strong>
              <p>每条摘要都附带时间点，点击即可回到对应字幕。</p>
              <button type="button" onClick={() => setTab("transcript")}>
                查看 04:37 的原文
              </button>
            </div>
          ) : null}

          {tab === "review" ? (
            <div className={styles.previewState} role="tabpanel">
              <CalendarClock aria-hidden size={20} />
              <strong>明日复习 1 项</strong>
              <p>今天保存的句子将在下一次复习中再次出现。</p>
              <Link href="/review">查看复习队列</Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
