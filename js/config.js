// ═══════════════════════════════════════════════════════════════
//  PROPOSAL WEBSITE — CENTRALIZED CONFIGURATION
//  Edit ONLY this file to personalize everything.
// ═══════════════════════════════════════════════════════════════

const CONFIG = {

  // ─── Names ──────────────────────────────────────────────────
  girlfriendName: "Jiya",
  creatorName: "Shlok",
  nickname: "Jiya", // tiny detail: how you actually call her
  // add your inside jokes / dates here for the letter to feel personal
  personalDetails: {
    firstMet: "that random day I never expected", // e.g. "12th March 2023"
    firstPhoto: "our first photo together",
    insideJoke: "your stupid cute laugh when you're nervous",
    favoriteSong: "our song on repeat at 2am",
    favoritePlace: "that little cafe we always end up at"
  },

  // ─── Intro ──────────────────────────────────────────────────
  introAudio: "public/audio/Netflix intro - QuickSounds.com.mp3",

  // ─── Profile Selection ──────────────────────────────────────
  profiles: [
    { name: "The one who's always right", photo: "public/images/profile.jpg", isCorrect: false },
    { name: "Knows the password", photo: "public/images/profile.jpg", isCorrect: false },
    { name: "Guessed the password", photo: "public/images/profile.jpg", isCorrect: false },
    { name: "Is the password ❤️", photo: "public/images/profile.jpg", isCorrect: true }
  ],

  // ─── Dashboard Hero ─────────────────────────────────────────
  hero: {
    backgroundImage: "public/images/dashboard-hero.jpg",
    title: "JIYA\n&\nSHLOK",
    badge: "Top 1 Most Passionate Couple",
    tagline: "My Favorite Story ❤️",
    description: "You came into my life unexpectedly, and somehow you became my favorite part of it. Every memory with you feels like a scene I never want to end.",
    ctaPlay: "▶ PLAY OUR STORY",
    ctaList: "♡ MY LIST",
    authorInfo: "Made with love by: Shlok\nFor: Jiya ❤️"
  },

  // ─── Horizontal Media Rows (dashboard carousels) ────────────
  mediaRows: [
    {
      title: "OUR FAVORITE MEMORIES",
      items: [
        { type: "photo", src: "public/images/fav-1.jpg", title: "Our First Memory", message: "Where it all started." },
        { type: "photo", src: "public/images/fav-2.jpg", title: "That Day ❤️", message: "A photo that speaks for itself." },
        { type: "photo", src: "public/images/fav-3.jpg", title: "My Favorite Smile", message: "You don't even try, yet you're perfect." },
        { type: "photo", src: "public/images/fav-4.jpg", title: "Us", message: "Always." },
        { type: "photo", src: "public/images/fav-5.jpg", title: "One of My Best Days", message: "Just being with you." },
        { type: "photo", src: "public/images/fav-6.jpg", title: "Forever Favorite", message: "Can't wait to make more." }
      ]
    },
    {
      title: "THE MOMENTS I KEEP REPLAYING",
      items: [
        { type: "photo", src: "public/images/replay-1.jpg", title: "Sunset", message: "Beautiful moments." },
        { type: "photo", src: "public/images/replay-2.jpg", title: "Looking at You", message: "I could get lost in your eyes forever." },
        { type: "photo", src: "public/images/replay-3.jpg", title: "Adventures", message: "Every trip with you is an adventure." },
        { type: "photo", src: "public/images/replay-4.jpg", title: "Laughing Together", message: "Your laugh is my favorite sound." },
        { type: "photo", src: "public/images/replay-5.jpg", title: "Cozy Afternoons", message: "Just you and me." }
      ]
    },
    {
      title: "OUR LITTLE MOVIE 🎬",
      items: [
        { type: "video", src: "public/videos/vid-1.mp4", cover: "public/images/vid-cover-1.jpg", title: "That Road Trip", message: "Singing along to our favorite songs." }
      ]
    }
  ],

  // ─── Feature Section ────────────────────────────────────────
  feature: {
    title: "THE REASON I KEEP WATCHING ❤️",
    photo: "public/images/feature-photo.jpg",
    message: "I could fill this entire page with memories, photos, and videos, but none of them really explain what you mean to me.\n\nYou're not just a part of my story.\n\nYou're my favorite chapter."
  },

  // ─── Story Video (Play Our Story experience) ────────────────
  storyVideo: "public/videos/vid-1.mp4",
  storyTimeline: [
    { type: "photo", source: "public/images/fav-1.jpg", start: 0, duration: 9, message: "Somehow, I found you.", animation: "slow-zoom" },
    { type: "photo", source: "public/images/fav-2.jpg", start: 9, duration: 8, message: "Then you became my favorite person.", animation: "slow-pan" },
    { type: "photo", source: "public/images/replay-2.jpg", start: 17, duration: 8, message: "Every little moment became a memory.", animation: "slow-zoom" },
    { type: "photo", source: "public/images/fav-3.jpg", start: 25, duration: 7, message: "And every memory became a reason to love you more.", animation: "slow-pan" },
    { type: "photo", source: "public/images/replay-4.jpg", start: 32, duration: 7, message: "Every laugh.", animation: "slow-zoom" },
    { type: "photo", source: "public/images/fav-5.jpg", start: 39, duration: 8, message: "Us.", animation: "slow-pan" },
    { type: "photo", source: "public/images/replay-3.jpg", start: 47, duration: 8, message: "My favorite story.", animation: "slow-zoom" },
    { type: "photo", source: "public/images/fav-6.jpg", start: 55, duration: 13, message: "You.", animation: "slow-zoom" }
  ],

  // ─── Cinematic Story Flow ───────────────────────────────────
  story: {
    seasonTitle: "JIYA & SHLOK",
    seasonSubtitle: "Season 1",
    openingLine: "Previously, in a story I never expected to live...",
    interludeLine: "And somehow… every chapter led me to you.",
    theEnd: "THE END",
    orMaybe: "...or maybe, our beginning."
  },

  // ─── Cinematic Photo Memory Sequence ────────────────────────
  // Now chaptered — each is an Episode
  memories: [
    { chapter: "CHAPTER 01 — The Beginning", episode: "EPISODE 01 — HOW IT STARTED", image: "public/images/fav-1.jpg", title: "The Beginning", message: "I didn't know it then, but this was the beginning of my favorite story.", duration: 4200 },
    { chapter: "CHAPTER 02 — You", episode: "EPISODE 02 — YOU", image: "public/images/fav-2.jpg", title: "You", message: "Somewhere along the way, you stopped being just someone I knew...", duration: 4200 },
    { chapter: "CHAPTER 03 — Us", episode: "EPISODE 03 — US", image: "public/images/replay-2.jpg", title: "Us", message: "...and became the person I couldn't imagine my life without.", duration: 4200 },
    { chapter: "CHAPTER 04 — My favorite smile", episode: "EPISODE 04 — MY FAVORITE PERSON", image: "public/images/fav-3.jpg", title: "My favorite smile", message: "Every picture here holds a piece of my heart.", duration: 4200 },
    { chapter: "CHAPTER 05 — Laughing together", episode: "EPISODE 05 — EVERY LAUGH", image: "public/images/replay-4.jpg", title: "Laughing Together", message: "Your laugh is my favorite sound in the world.", duration: 4200 },
    { chapter: "CHAPTER 06 — One of my best days", episode: "EPISODE 06 — BEST DAYS", image: "public/images/fav-5.jpg", title: "One of My Best Days", message: "You make the ordinary feel extraordinary.", duration: 4200 },
    { chapter: "CHAPTER 07 — Adventures", episode: "EPISODE 07 — ADVENTURES", image: "public/images/replay-3.jpg", title: "Adventures", message: "Every adventure with you is my new favorite.", duration: 4200 },
    { chapter: "FINAL CHAPTER — Forever", episode: "FINAL EPISODE — THE QUESTION", image: "public/images/fav-6.jpg", title: "Forever Favorite", message: "And this... this is just the beginning.", duration: 4800 }
  ],

  // ─── Final CTA Button ──────────────────────────────────────
  finalCta: "ONE LAST THING...",

  // ─── Proposal Screen — Simple & Cinematic ───────────────────
  proposal: {
    backgroundImage: "public/images/feature-photo.jpg",
    // Minimal lines that appear one by one with pauses
    simpleLines: [
      "Jiya...",
      "Every memory...",
      "Every laugh...",
      "Every little moment...",
      "You became my favorite part of all of it."
    ],
    questionIntro: "I have one question for you.",
    question: "WILL YOU BE MINE?",
    heart: "❤️",
    btnYes: "YES ❤️",
    btnYesCourse: "YES, OF COURSE ❤️",
    // Favorite photo that slowly appears before the question
    questionPhoto: "public/images/fav-6.jpg",
    // YES evolution
    celebrationStages: {
      sheSaid: "She said...",
      yes: "YES. ❤️",
      nextChapter: "Our next chapter starts now.",
      finalTitle: "JIYA ❤️ SHLOK"
    },
    celebrationImage: "public/images/fav-6.jpg",
    // Personal letter — replace with your own words!
    letter: {
      buttonText: "One last thing... 💌",
      title: "For my Jiya,",
      body: "I don't know what our next chapter looks like yet.\nI just know I want to be there for it — with you.\n\nThank you for becoming my favorite person, my favorite memory, and my favorite part of every day.\n\nYour laugh, your stupid cute jokes, our late night talks, even the way you always steal the blanket — it's all my favorite.\n\nThis isn't the end of our story.\nIt's the beginning. ❤️",
      sign: "— Shlok"
    }
  },

  // ─── Audio — different stages ───────────────────────────────
  audio: {
    storySoundtrack: "public/audio/those-eyes.mp3",
    storySoundtrackYoutubeId: "t1dvrcqlQgI",
    backgroundMusic: "",        // dashboard ambient — leave empty for silent or add file
    photoMusic: "",             // soft emotional for photo sequence
    proposalMusic: "",          // quiet before question, rises after YES
    celebrationMusic: ""
  }
};
