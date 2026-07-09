export interface Channel {
  id: string;
  name: string;
  description: string;
  subscriberCount?: string;
  thumbnailUrl: string;
}

export interface MockVideo {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  channelThumbnailUrl?: string;
  thumbnailUrl: string;
  duration: string;
  views: string;
  parsedAt: string;
}

export interface MockWord {
  id: string;
  lemma: string;
  phonetic: string;
  definitionZh: string;
  definitionEn?: string;
  definitionZhFull?: string;
  exampleEn?: string;
  exampleZh?: string;
  occurrences: number;
  date: string;
  isFavorite: boolean;
  phoneticUk?: string;
  phoneticUs?: string;
  partOfSpeech?: string;
}

export const CHANNELS: Channel[] = [
  // Subscribed Channels
  {
    id: "1001-album",
    name: "1001 Album Complaints",
    description: "The Chop Unlimited... Music discussions and deep analysis of legendary albums.",
    subscriberCount: "12K",
    thumbnailUrl: "https://unavatar.io/youtube/@1001AlbumComplaints?fallback=https://ui-avatars.com/api/?name=1001+Album&size=200&background=d35400&color=fff&bold=true",
  },
  {
    id: "10-percent-happier",
    name: "10% Happier with Dan Harris",
    description: "Conversations on meditation, mindfulness, and mental health.",
    subscriberCount: "250K",
    thumbnailUrl: "https://unavatar.io/youtube/@TenPercentHappier?fallback=https://ui-avatars.com/api/?name=10+Happier&size=200&background=2c3e50&color=fff&bold=true",
  },
  {
    id: "13-again",
    name: "13 Again",
    description: "Max, Harvey and friends. Welcome to the teenage life and growing up vlog.",
    subscriberCount: "95K",
    thumbnailUrl: "https://unavatar.io/youtube/@13Again?fallback=https://ui-avatars.com/api/?name=13+Again&size=200&background=8e44ad&color=fff&bold=true",
  },
  {
    id: "14-minuten",
    name: "14 Minuten - Deine tägliche Portion Deutsch",
    description: "Patrick Thun und sein Team helfen dir, jeden tag 14 Minuten Deutsch zu lernen.",
    subscriberCount: "45K",
    thumbnailUrl: "https://unavatar.io/youtube/@14Minuten?fallback=https://ui-avatars.com/api/?name=14+Min&size=200&background=c0392b&color=fff&bold=true",
  },
  {
    id: "1619",
    name: "1619",
    description: "The New York Times project examining the history of slavery.",
    subscriberCount: "1.2M",
    thumbnailUrl: "https://unavatar.io/youtube/@1619Project?fallback=https://ui-avatars.com/api/?name=1619&size=200&background=1a1a2e&color=e94560&bold=true",
  },
  {
    id: "20-minute-books",
    name: "20 Minute Books",
    description: "Summarises the best non-fiction books in 20 minutes.",
    subscriberCount: "80K",
    thumbnailUrl: "https://unavatar.io/youtube/@20MinuteBooks?fallback=https://ui-avatars.com/api/?name=20+Min+Books&size=200&background=2d6a4f&color=fff&bold=true",
  },
  // Recommended / Other Channels (真实频道使用 unavatar)
  {
    id: "ali-abdaal",
    name: "Ali Abdaal",
    description: "Learn how to build a life you love with productivity, tech, and entrepreneurship.",
    subscriberCount: "6.4M 订阅者",
    thumbnailUrl: "https://unavatar.io/youtube/@aliabdaal?fallback=https://ui-avatars.com/api/?name=Ali+Abdaal&size=200&background=10b981&color=fff&bold=true",
  },
  {
    id: "bbc-learning-english",
    name: "BBC Learning English",
    description: "Learn English with the BBC. We publish new videos daily to improve your vocabulary.",
    subscriberCount: "8.9M 订阅者",
    thumbnailUrl: "https://unavatar.io/youtube/@bbclearningenglish?fallback=https://ui-avatars.com/api/?name=BBC+Learning+English&size=200&background=bb1919&color=fff&bold=true",
  },
  {
    id: "bbc-news",
    name: "BBC News",
    description: "The official BBC News YouTube channel. News stories and analysis.",
    subscriberCount: "15M 订阅者",
    thumbnailUrl: "https://unavatar.io/youtube/@BBCNews?fallback=https://ui-avatars.com/api/?name=BBC+News&size=200&background=bb1919&color=fff&bold=true",
  },
  {
    id: "emma-chamberlain",
    name: "emma chamberlain",
    description: "lifestyle vlogs, fashion, and authentic conversation.",
    subscriberCount: "12.1M 订阅者",
    thumbnailUrl: "https://unavatar.io/youtube/@emmachamberlain?fallback=https://ui-avatars.com/api/?name=Emma+Chamberlain&size=200&background=f472b6&color=fff&bold=true",
  },
  {
    id: "vox",
    name: "Vox",
    description: "Vox explains our complex world with explanatory journalism.",
    subscriberCount: "11M 订阅者",
    thumbnailUrl: "https://unavatar.io/youtube/@Vox?fallback=https://ui-avatars.com/api/?name=Vox&size=200&background=f1c40f&color=fff&bold=true",
  },
  {
    id: "ted",
    name: "TED",
    description: "Ideas worth spreading from world-class thinkers and doers.",
    subscriberCount: "23M 订阅者",
    thumbnailUrl: "https://unavatar.io/youtube/@TED?fallback=https://ui-avatars.com/api/?name=TED&size=200&background=e62b1e&color=fff&bold=true",
  },
];

export const MOCK_VIDEOS: MockVideo[] = [
  {
    videoId: "BV1f34y1q7xx",
    title: "《汾河湾》全场解析，事情的真相是？",
    channelId: "bilibili-锅の缸",
    channelName: "锅の缸",
    thumbnailUrl: "https://images.unsplash.com/photo-1598257006458-087169a1f08d?w=500",
    duration: "34:16",
    views: "120K",
    parsedAt: "2026-05-31",
  },
  {
    videoId: "mwOB_pVNI1c",
    title: "How to Build Self-Discipline (TED-Ed Lessons)",
    channelId: "ted",
    channelName: "TED",
    thumbnailUrl: "https://i.ytimg.com/vi/mwOB_pVNI1c/hqdefault.jpg",
    duration: "5:32",
    views: "1.2M",
    parsedAt: "2026-05-22",
  },
  {
    videoId: "rng_yUSwrgU",
    title: "Why sleep is your superpower | Matt Walker",
    channelId: "ted",
    channelName: "TED",
    thumbnailUrl: "https://i.ytimg.com/vi/rng_yUSwrgU/hqdefault.jpg",
    duration: "19:12",
    views: "5.4M",
    parsedAt: "2026-05-21",
  },
  {
    videoId: "Rni7Fz7208c",
    title: "Elon Musk: The Future of Humanity, AI, and Twitter",
    channelId: "bbc-news",
    channelName: "BBC News",
    thumbnailUrl: "https://i.ytimg.com/vi/Rni7Fz7208c/hqdefault.jpg",
    duration: "2:08:45",
    views: "18.7K",
    parsedAt: "2026-05-20",
  },
  {
    videoId: "33bZIOLX4do",
    title: "How to Stop Procrastinating: A Scientific Guide to Focus",
    channelId: "ali-abdaal",
    channelName: "Ali Abdaal",
    thumbnailUrl: "https://i.ytimg.com/vi/33bZIOLX4do/hqdefault.jpg",
    duration: "14:22",
    views: "120K",
    parsedAt: "2026-05-19",
  },
  {
    videoId: "dhCcLMc0AQg",
    title: "How to Learn Anything Fast: The Feynman Technique Explained",
    channelId: "bbc-learning-english",
    channelName: "BBC Learning English",
    thumbnailUrl: "https://i.ytimg.com/vi/dhCcLMc0AQg/hqdefault.jpg",
    duration: "8:15",
    views: "340K",
    parsedAt: "2026-05-20",
  },
  {
    videoId: "LOn-mmezykQ",
    title: "The Ultimate Guide to Active Recall & Spaced Repetition Study Methods",
    channelId: "ali-abdaal",
    channelName: "Ali Abdaal",
    thumbnailUrl: "https://i.ytimg.com/vi/LOn-mmezykQ/hqdefault.jpg",
    duration: "18:40",
    views: "450K",
    parsedAt: "2026-05-18",
  },
  {
    videoId: "enaGNnGB99I",
    title: "How I Study for Exams (Anki, Spaced Repetition, Active Recall)",
    channelId: "emma-chamberlain",
    channelName: "emma chamberlain",
    thumbnailUrl: "https://i.ytimg.com/vi/enaGNnGB99I/hqdefault.jpg",
    duration: "12:55",
    views: "220K",
    parsedAt: "2026-05-17",
  },
  {
    videoId: "zIwLWfaAg-8",
    title: "Elon Musk on Mars, Artificial Intelligence, and the Future of Tesla",
    channelId: "vox",
    channelName: "Vox",
    thumbnailUrl: "https://i.ytimg.com/vi/zIwLWfaAg-8/hqdefault.jpg",
    duration: "35:10",
    views: "1.8M",
    parsedAt: "2026-05-16",
  },
  {
    videoId: "YRvf00NooN8",
    title: "Elon Musk: Why we must merge with AI to survive the future",
    channelId: "vox",
    channelName: "Vox",
    thumbnailUrl: "https://i.ytimg.com/vi/YRvf00NooN8/hqdefault.jpg",
    duration: "22:15",
    views: "980K",
    parsedAt: "2026-05-15",
  },
  {
    videoId: "BYXbuik3dgA",
    title: "Elon Musk's Ultimate Advice for Students & Young People",
    channelId: "bbc-news",
    channelName: "BBC News",
    thumbnailUrl: "https://i.ytimg.com/vi/BYXbuik3dgA/hqdefault.jpg",
    duration: "15:40",
    views: "750K",
    parsedAt: "2026-05-14",
  },
  {
    videoId: "O4wBUysNe2k",
    title: "Why Elon Musk thinks AI is far more dangerous than nuclear weapons",
    channelId: "bbc-news",
    channelName: "BBC News",
    thumbnailUrl: "https://i.ytimg.com/vi/O4wBUysNe2k/hqdefault.jpg",
    duration: "12:12",
    views: "1.1M",
    parsedAt: "2026-05-13",
  },
  {
    videoId: "vif8NQcjVf0",
    title: "The Joe Rogan Experience: How to Optimize Your Brain & Focus",
    channelId: "10-percent-happier",
    channelName: "10% Happier with Dan Harris",
    thumbnailUrl: "https://i.ytimg.com/vi/vif8NQcjVf0/hqdefault.jpg",
    duration: "2:15:00",
    views: "85K",
    parsedAt: "2026-05-12",
  },
  {
    videoId: "oX7OduG1YmI",
    title: "The Daily Stoic: How to Control Your Emotions Under Hard Pressure",
    channelId: "10-percent-happier",
    channelName: "10% Happier with Dan Harris",
    thumbnailUrl: "https://i.ytimg.com/vi/oX7OduG1YmI/hqdefault.jpg",
    duration: "10:30",
    views: "94K",
    parsedAt: "2026-05-11",
  },
  {
    videoId: "8Ve5SAFPYZ8",
    title: "How to Master Your Mind: Stoicism, Focus & Modern Success Strategies",
    channelId: "1001-album",
    channelName: "1001 Album Complaints",
    thumbnailUrl: "https://i.ytimg.com/vi/8Ve5SAFPYZ8/hqdefault.jpg",
    duration: "14:11",
    views: "60K",
    parsedAt: "2026-05-10",
  },
  {
    videoId: "pBRSZBtirAk",
    title: "The Science of Habit Formation: James Clear Atomic Habits Interview",
    channelId: "13-again",
    channelName: "13 Again",
    thumbnailUrl: "https://i.ytimg.com/vi/pBRSZBtirAk/hqdefault.jpg",
    duration: "45:30",
    views: "230K",
    parsedAt: "2026-05-09",
  },
  {
    videoId: "rKpltaOMFdc",
    title: "Why you are always tired: Sleep Science & Brain Recovery Explained",
    channelId: "14-minuten",
    channelName: "14 Minuten - Deine tägliche Portion Deutsch",
    thumbnailUrl: "https://i.ytimg.com/vi/rKpltaOMFdc/hqdefault.jpg",
    duration: "12:00",
    views: "140K",
    parsedAt: "2026-05-08",
  },
  {
    videoId: "hmtuvNfytjM",
    title: "German Language Course: Learn German Fluently in 14 Minutes",
    channelId: "14-minuten",
    channelName: "14 Minuten - Deine tägliche Portion Deutsch",
    thumbnailUrl: "https://i.ytimg.com/vi/hmtuvNfytjM/hqdefault.jpg",
    duration: "14:00",
    views: "89K",
    parsedAt: "2026-05-07",
  },
  {
    videoId: "B-_tiKTCSQ0",
    title: "Lo-fi Beats for Studying, Deep Working, and Mindful Relaxation",
    channelId: "1001-album",
    channelName: "1001 Album Complaints",
    thumbnailUrl: "https://i.ytimg.com/vi/B-_tiKTCSQ0/hqdefault.jpg",
    duration: "3:45",
    views: "1.2M",
    parsedAt: "2026-05-06",
  },
  {
    videoId: "egeqfUGiETY",
    title: "The Huberman Lab: How to Focus & Trigger Deep Work Brainwaves",
    channelId: "10-percent-happier",
    channelName: "10% Happier with Dan Harris",
    thumbnailUrl: "https://i.ytimg.com/vi/egeqfUGiETY/hqdefault.jpg",
    duration: "1:55:00",
    views: "420K",
    parsedAt: "2026-05-05",
  },
  {
    videoId: "9Kl-wO_j5GM",
    title: "Ali Abdaal: My 10 Favorite Books of All Time for Growth",
    channelId: "ali-abdaal",
    channelName: "Ali Abdaal",
    thumbnailUrl: "https://i.ytimg.com/vi/9Kl-wO_j5GM/hqdefault.jpg",
    duration: "18:22",
    views: "190K",
    parsedAt: "2026-05-04",
  },
  {
    videoId: "5MWT_doo68k",
    title: "Vox Explainers: The Complete History of the Internet & World Wide Web",
    channelId: "vox",
    channelName: "Vox",
    thumbnailUrl: "https://i.ytimg.com/vi/5MWT_doo68k/hqdefault.jpg",
    duration: "15:00",
    views: "3.4M",
    parsedAt: "2026-05-03",
  },
  {
    videoId: "HAnw168huqA",
    title: "The Diary of a CEO: The Art of Deep Focus and Mental Resiliency",
    channelId: "1619",
    channelName: "1619",
    thumbnailUrl: "https://i.ytimg.com/vi/HAnw168huqA/hqdefault.jpg",
    duration: "1:10:00",
    views: "800K",
    parsedAt: "2026-05-02",
  },
  {
    videoId: "R2meHtrO1n8",
    title: "How to Read 100 Books a Year: Speed Reading & Retention Guide",
    channelId: "20-minute-books",
    channelName: "20 Minute Books",
    thumbnailUrl: "https://i.ytimg.com/vi/R2meHtrO1n8/hqdefault.jpg",
    duration: "20:00",
    views: "95K",
    parsedAt: "2026-05-01",
  },
  {
    videoId: "NcaQUH2K-wo",
    title: "The Tim Ferriss Show: How to Deconstruct Any Skill for Fast Acquisition",
    channelId: "1619",
    channelName: "1619",
    thumbnailUrl: "https://i.ytimg.com/vi/NcaQUH2K-wo/hqdefault.jpg",
    duration: "1:32:00",
    views: "310K",
    parsedAt: "2026-04-30",
  }
];

export function getChannelById(channelId?: string | null) {
  return CHANNELS.find((channel) => channel.id === channelId);
}

export function getChannelForVideo(video?: Pick<MockVideo, "channelId" | "channelName"> | null) {
  if (!video) return undefined;
  return getChannelById(video.channelId) ?? CHANNELS.find((channel) => channel.name === video.channelName);
}

export function getChannelAvatarUrl(video?: Pick<MockVideo, "channelId" | "channelName" | "channelThumbnailUrl"> | null) {
  return video?.channelThumbnailUrl ?? getChannelForVideo(video)?.thumbnailUrl ?? getYouTubeChannelAvatarUrl(video?.channelName);
}

export function getYouTubeChannelAvatarUrl(channelName?: string | null) {
  if (!channelName) return undefined;
  const handle = channelName.replace(/[^a-zA-Z0-9]/g, "");
  const fallbackName = encodeURIComponent(channelName.trim()).replace(/%20/g, "+");
  return `https://unavatar.io/youtube/@${handle}?fallback=https://ui-avatars.com/api/?name=${fallbackName}&size=200&background=111827&color=fff&bold=true`;
}

export interface MockSentence {
  id: string;
  text: string;
  translation: string;
  sourceVideoTitle: string;
  sourceVideoId: string;
  collectedAt: string;
  isFavorite: boolean;
  tags: string[];
}

export const INITIAL_SENTENCES: MockSentence[] = [
  {
    id: "s1",
    text: "The way we think about work is broken.",
    translation: "我们对工作的看法是错误的。",
    sourceVideoTitle: "How to Build Self-Discipline",
    sourceVideoId: "mwOB_pVNI1c",
    collectedAt: "2026-05-22",
    isFavorite: false,
    tags: ["work", "motivation"],
  },
  {
    id: "s2",
    text: "Sleep is your superpower — it enhances your memory, regulates your emotions, and protects you against cancer.",
    translation: "睡眠是你的超能力——它能增强记忆力、调节情绪、并预防癌症。",
    sourceVideoTitle: "Why sleep is your superpower",
    sourceVideoId: "rng_yUSwrgU",
    collectedAt: "2026-05-21",
    isFavorite: true,
    tags: ["health", "science"],
  },
  {
    id: "s3",
    text: "The Feynman technique is simple: if you can't explain it simply, you don't understand it well enough.",
    translation: "费曼技巧很简单：如果你不能简单地解释它，说明你还没有足够理解它。",
    sourceVideoTitle: "How to Learn Anything Fast",
    sourceVideoId: "dhCcLMc0AQg",
    collectedAt: "2026-05-20",
    isFavorite: false,
    tags: ["learning", "technique"],
  },
  {
    id: "s4",
    text: "Active recall is the process of actively stimulating memory during the learning process.",
    translation: "主动回忆是在学习过程中主动刺激记忆的过程。",
    sourceVideoTitle: "The Ultimate Guide to Active Recall",
    sourceVideoId: "LOn-mmezykQ",
    collectedAt: "2026-05-19",
    isFavorite: true,
    tags: ["learning", "memory"],
  },
  {
    id: "s5",
    text: "Your habits shape your identity, and your identity shapes your habits.",
    translation: "你的习惯塑造你的身份，你的身份又反过来塑造你的习惯。",
    sourceVideoTitle: "The Science of Habit Formation",
    sourceVideoId: "pBRSZBtirAk",
    collectedAt: "2026-05-18",
    isFavorite: false,
    tags: ["habits", "identity"],
  },
  {
    id: "s6",
    text: "Practice doesn't make perfect. Practice makes permanent.",
    translation: "练习不会成就完美，练习会成就永恒。",
    sourceVideoTitle: "How to Read 100 Books a Year",
    sourceVideoId: "R2meHtrO1n8",
    collectedAt: "2026-05-17",
    isFavorite: false,
    tags: ["practice", "learning"],
  },
  {
    id: "s7",
    text: "The only way to do great work is to love what you do.",
    translation: "唯一做出伟大工作的方法是热爱你的工作。",
    sourceVideoTitle: "Steve Jobs Stanford Commencement",
    sourceVideoId: "UF8uR6Z6KLc",
    collectedAt: "2026-05-16",
    isFavorite: true,
    tags: ["career", "motivation"],
  },
  {
    id: "s8",
    text: "Stay hungry, stay foolish.",
    translation: "保持饥饿，保持愚蠢（求知若渴，虚心若愚）。",
    sourceVideoTitle: "Steve Jobs Stanford Commencement",
    sourceVideoId: "UF8uR6Z6KLc",
    collectedAt: "2026-05-16",
    isFavorite: false,
    tags: ["wisdom", "motivation"],
  },
  {
    id: "s9",
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    translation: "成功不是终点，失败也不是致命的：最重要的是坚持下去的勇气。",
    sourceVideoTitle: "How to Control Your Emotions Under Hard Pressure",
    sourceVideoId: "oX7OduG1YmI",
    collectedAt: "2026-05-15",
    isFavorite: false,
    tags: ["resiliency", "stoicism"],
  },
  {
    id: "s10",
    text: "The future belongs to those who believe in the beauty of their dreams.",
    translation: "未来属于那些相信自己梦想之美的人。",
    sourceVideoTitle: "Why we must merge with AI to survive",
    sourceVideoId: "YRvf00NooN8",
    collectedAt: "2026-05-14",
    isFavorite: false,
    tags: ["future", "dreams"],
  },
  {
    id: "s11",
    text: "Strive not to be a success, but rather to be of value.",
    translation: "不要为成功而努力，而要为做个有价值的人而努力。",
    sourceVideoTitle: "How to Optimize Your Brain & Focus",
    sourceVideoId: "vif8NQcjVf0",
    collectedAt: "2026-05-13",
    isFavorite: false,
    tags: ["value", "career"],
  },
  {
    id: "s12",
    text: "Simplicity is the ultimate sophistication.",
    translation: "极简是终极的复杂与高档。",
    sourceVideoTitle: "The Complete History of the Internet",
    sourceVideoId: "5MWT_doo68k",
    collectedAt: "2026-05-12",
    isFavorite: true,
    tags: ["design", "minimalism"],
  },
  {
    id: "s13",
    text: "An investment in knowledge pays the best interest.",
    translation: "对知识的投资能支付最好的利息（最划算）。",
    sourceVideoTitle: "How to Learn Anything Fast",
    sourceVideoId: "dhCcLMc0AQg",
    collectedAt: "2026-05-11",
    isFavorite: false,
    tags: ["investment", "education"],
  },
  {
    id: "s14",
    text: "Your time is limited, so don't waste it living someone else's life.",
    translation: "你的时间是有限的，所以不要浪费它去过别人的生活。",
    sourceVideoTitle: "Steve Jobs Stanford Commencement",
    sourceVideoId: "UF8uR6Z6KLc",
    collectedAt: "2026-05-10",
    isFavorite: true,
    tags: ["life", "wisdom"],
  },
  {
    id: "s15",
    text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.",
    translation: "学习的能力是天赋；学习的方法是技能；学习的意愿则是选择。",
    sourceVideoTitle: "Feynman Technique Deep Dive",
    sourceVideoId: "dhCcLMc0AQg",
    collectedAt: "2026-05-09",
    isFavorite: false,
    tags: ["learning", "choices"],
  },
  {
    id: "s16",
    text: "Habits are the compound interest of self-improvement.",
    translation: "习惯是自我提升的复利。",
    sourceVideoTitle: "James Clear Atomic Habits Interview",
    sourceVideoId: "pBRSZBtirAk",
    collectedAt: "2026-05-08",
    isFavorite: false,
    tags: ["habits", "improvement"],
  },
  {
    id: "s17",
    text: "Focus is a muscle, and you build it through distraction-free deep work.",
    translation: "专注是一块肌肉，你可以通过无干扰的深度工作来锻炼它。",
    sourceVideoTitle: "How to Trigger Deep Work Brainwaves",
    sourceVideoId: "egeqfUGiETY",
    collectedAt: "2026-05-07",
    isFavorite: true,
    tags: ["focus", "productivity"],
  },
  {
    id: "s18",
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    translation: "优秀不是一次性的行为，而是一种习惯。我们反复做的事塑造了我们。",
    sourceVideoTitle: "Stoicism Focus & Modern Success",
    sourceVideoId: "8Ve5SAFPYZ8",
    collectedAt: "2026-05-06",
    isFavorite: false,
    tags: ["excellence", "philosophy"],
  },
  {
    id: "s19",
    text: "The secret of getting ahead is getting started.",
    translation: "保持领先的秘诀在于开始行动。",
    sourceVideoTitle: "How to Stop Procrastinating",
    sourceVideoId: "33bZIOLX4do",
    collectedAt: "2026-05-05",
    isFavorite: false,
    tags: ["action", "procrastination"],
  },
  {
    id: "s20",
    text: "The limit of your language is the limit of your world.",
    translation: "语言的边界，就是你世界的边界。",
    sourceVideoTitle: "German Language Course Fluency",
    sourceVideoId: "hmtuvNfytjM",
    collectedAt: "2026-05-04",
    isFavorite: true,
    tags: ["language", "worldview"],
  }
];

export const INITIAL_WORDS: MockWord[] = [
  {
    id: "w1",
    lemma: "prime",
    phonetic: "/praɪm/",
    phoneticUk: "/praɪm/",
    phoneticUs: "/praɪm/",
    partOfSpeech: "adj.",
    definitionZh: "adj. 主要的，首要的；优质的，第一流的；最可能的，最适合的；最理想的，最典型",
    definitionZhFull: `adj. 主要的，首要的；优质的，第一流的；最可能的，最适合的；最理想的，最典型的；最初的，原始的；素（或质）数的（如2，3，5，7，11）；互为素或质数的\nv. 事先指点，使（某人）做好准备；把（某事物）准备好，使备用；给（表面）涂上底色\nn. 盛年，壮年时期；质数，素数；上标符号(')，(数字后)分钟(或英尺)符号；(八个防御姿势的)第一姿势；(自行车比赛中设特别奖的)特设行程；<古>起始，原初；晨经，晨经（传统上于白天中的第一个小时即早晨六点所做的祈祷，现罕用）\n【名】 (Prime) (英) 普赖姆，(德) 普里梅 (人名)`,
    exampleEn: "This is a prime example of the artist's work.",
    exampleZh: "这是该艺术家作品的一个典型范例。",
    occurrences: 85,
    date: "2026-05-20",
    isFavorite: false
  },
  {
    id: "w2",
    lemma: "saying",
    phonetic: "/'seɪɪŋ/",
    phoneticUk: "/'seɪɪŋ/",
    phoneticUs: "/'seɪɪŋ/",
    partOfSpeech: "n.",
    definitionZh: "n. 谚语，格言，警句；（尤指宗教或政治领袖的）重要讲话，教海",
    definitionZhFull: "n. 谚语，格言，警句；（尤指宗教或政治领袖的）重要讲话，教诲\nv. 说，讲（say的现在分词）",
    exampleEn: "As the old saying goes, 'practice makes perfect'.",
    exampleZh: "正如那句古老格言所说：“熟能生巧”。",
    occurrences: 58,
    date: "2026-04-04",
    isFavorite: false
  },
  {
    id: "w3",
    lemma: "party",
    phonetic: "/'pɑːti/",
    phoneticUk: "/'pɑːti/",
    phoneticUs: "/'pɑːr-ti/",
    partOfSpeech: "n.",
    definitionZh: "n. 聚会，派对；政党，党派；<正式>（契约或争论的）当事人，一方；队，组，群；<正",
    definitionZhFull: "n. 聚会，派对；政党，党派；<正式>（契约或争论的）当事人，一方；队，组，群；<正式> 社交聚会；同类性质 of the party 人马\nv. 尽情狂欢，宴乐",
    exampleEn: "Are you going to the party tonight?",
    exampleZh: "你今晚去参加派对吗？",
    occurrences: 57,
    date: "2026-04-04",
    isFavorite: false
  },
  {
    id: "w4",
    lemma: "iran",
    phonetic: "/ɪ'rɑːn; ɪ'ræn/",
    phoneticUk: "/ɪ'rɑːn/",
    phoneticUs: "/ɪ'ræn/",
    partOfSpeech: "n.",
    definitionZh: "n. 伊朗（亚洲国家）；（美、巴）伊朗（人名)",
    definitionZhFull: "n. 伊朗（中东国家，亚洲国家）\n【名】 (Iran) (美、巴) 伊朗 (人名)",
    exampleEn: "Iran puts forward its latest proposal.",
    exampleZh: "伊朗提出了其最新的提议。",
    occurrences: 74,
    date: "2026-04-04",
    isFavorite: false
  },
  {
    id: "w5",
    lemma: "can",
    phonetic: "/kæn; kən/",
    phoneticUk: "/kæn/",
    phoneticUs: "/kæn/",
    partOfSpeech: "v.",
    definitionZh: "v. （表示有能力做或能够发生）能，会；...",
    definitionZhFull: "aux. 能，会；能够；可能；可以，被允许；会，懂得；请，让（表示客气的请求或命令）\nn. （食品、饮料等）金属罐；一罐的量；容器；喷壶；监狱；厕所\nv. 把（食品）装罐保存；解雇，开除；停止（做某事）",
    exampleEn: "She can speak English very fluently.",
    exampleZh: "她能说一口流利的英语。",
    occurrences: 92,
    date: "2026-04-03",
    isFavorite: false
  }
];
