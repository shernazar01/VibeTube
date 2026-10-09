import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Menu, Search, Mic, Plus, Bell, Home, PlaySquare, Clock3,
  ThumbsUp, ListVideo, Download, ChevronRight, ChevronDown,
  MoreVertical, Film, X, History, Bookmark, ExternalLink, RefreshCw
} from "lucide-react";
import "./style.css";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY?.trim();
const API_BASE = "https://www.googleapis.com/youtube/v3";
const HISTORY_KEY = "vibetube_history";
const WATCH_LATER_KEY = "vibetube_watch_later";

const categories = [
  "Hammasi", "Musiqa", "Mikslar", "Gaming", "Jonli", "Sport o'yinlari",
  "Futbol", "Rep aytish", "Yaqinda yuklangan", "Tomosha qilingan", "Siz uchun yangi"
];

const categoryQueries = {
  "Musiqa": "music uzbek",
  "Mikslar": "music mix",
  "Gaming": "gaming",
  "Jonli": "live",
  "Sport o'yinlari": "sports",
  "Futbol": "football futbol",
  "Rep aytish": "rap uzbek",
  "Yaqinda yuklangan": "uzbek new",
  "Siz uchun yangi": "trending uzbek"
};

const subscriptions = [
  ["OMONXON", "https://i.pravatar.cc/80?img=12"],
  ["ISRAILOVJR", "https://i.pravatar.cc/80?img=14"],
  ["Otabek Sharipov", "https://i.pravatar.cc/80?img=33"],
  ["Sams Asyifa tv", "https://i.pravatar.cc/80?img=45"],
  ["Obidjon Nasriddin", "https://i.pravatar.cc/80?img=11"],
  ["Mirjalol Nematov", "https://i.pravatar.cc/80?img=53"],
  ["Sevinch Ismoilova", "https://i.pravatar.cc/80?img=47"]
];

function loadJson(key, fallback = []) {
  try {
    return JSON.parse(
      localStorage.getItem(key) || JSON.stringify(fallback)
    );
  } catch {
    return fallback;
  }
}

function App() {
  const [sidebar, setSidebar] = useState(true);
  const [active, setActive] = useState("Hammasi");
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(
    () => localStorage.getItem("vibetube_theme") !== "light"
  );
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [searchMode, setSearchMode] = useState(false);
  const [history, setHistory] = useState(() => loadJson(HISTORY_KEY));
  const [watchLater, setWatchLater] = useState(() =>
    loadJson(WATCH_LATER_KEY)
  );
  const [notice, setNotice] = useState("");

  useEffect(() => {
    localStorage.setItem("vibetube_theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(
      WATCH_LATER_KEY,
      JSON.stringify(watchLater)
    );
  }, [watchLater]);

  const request = useCallback(async (path) => {
    if (!API_KEY) {
      throw new Error(
        "YouTube API kaliti topilmadi. .env fayliga VITE_YOUTUBE_API_KEY ni yozing."
      );
    }

    const response = await fetch(
      `${API_BASE}${path}${
        path.includes("?") ? "&" : "?"
      }key=${encodeURIComponent(API_KEY)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message || "YouTube API xatosi"
      );
    }

    return data;
  }, []);

  const mapVideos = useCallback(
    (items, category = active) =>
      items
        .map((item) => ({
          id: item.id?.videoId || item.id,
          title: item.snippet?.title || "Nomsiz video",
          channel: item.snippet?.channelTitle || "YouTube",
          channelId: item.snippet?.channelId || "",
          views: formatViews(item.statistics?.viewCount),
          time: formatDate(item.snippet?.publishedAt),
          duration: formatDuration(
            item.contentDetails?.duration
          ),
          category,
          description: item.snippet?.description || "",
          thumb:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url,
          avatar:
            item.channelAvatar ||
            `https://i.pravatar.cc/80?u=${encodeURIComponent(
              item.snippet?.channelId || item.id
            )}`
        }))
        .filter((video) => video.id),
    [active]
  );

  const enrichChannels = useCallback(
    async (items) => {
      const ids = [
        ...new Set(
          items
            .map((x) => x.snippet?.channelId)
            .filter(Boolean)
        )
      ].join(",");

      if (!ids) return items;

      try {
        const data = await request(
          `/channels?part=snippet&id=${ids}`
        );

        const avatars = Object.fromEntries(
          (data.items || []).map((ch) => [
            ch.id,
            ch.snippet?.thumbnails?.default?.url
          ])
        );

        return items.map((x) => ({
          ...x,
          channelAvatar:
            avatars[x.snippet?.channelId]
        }));
      } catch {
        return items;
      }
    },
    [request]
  );

  const fetchPopularVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSearchMode(false);

      /*
       * regionCode=UZ olib tashlandi.
       * Shu sababli invalid region code xatosi bo'lmaydi.
       */
      const data = await request(
        `/videos?part=snippet,statistics,contentDetails&chart=mostPopular&maxResults=24`
      );

      const items = await enrichChannels(data.items || []);

      setVideos(mapVideos(items, "Hammasi"));
    } catch (err) {
      setError(err.message);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [enrichChannels, mapVideos, request]);

  const searchYouTube = useCallback(
    async (query, order = "relevance") => {
      const q = query.trim();

      if (!q) {
        return fetchPopularVideos();
      }

      try {
        setLoading(true);
        setError("");
        setSearchMode(true);

        /*
         * regionCode=UZ olib tashlandi.
         */
        const data = await request(
          `/search?part=snippet&q=${encodeURIComponent(
            q
          )}&type=video&maxResults=24&order=${order}&safeSearch=moderate`
        );

        const searchItems = data.items || [];

        const ids = searchItems
          .map((item) => item.id?.videoId)
          .filter(Boolean)
          .join(",");

        if (!ids) {
          setVideos([]);
          return;
        }

        const details = await request(
          `/videos?part=snippet,statistics,contentDetails&id=${ids}`
        );

        const merged = details.items || [];

        const orderMap = new Map(
          searchItems.map((item, index) => [
            item.id?.videoId,
            index
          ])
        );

        const ordered = [...merged].sort(
          (a, b) =>
            (orderMap.get(a.id) ?? 999) -
            (orderMap.get(b.id) ?? 999)
        );

        const items = await enrichChannels(ordered);

        setVideos(mapVideos(items, active));
      } catch (err) {
        setError(err.message);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    },
    [
      active,
      enrichChannels,
      fetchPopularVideos,
      mapVideos,
      request
    ]
  );

  useEffect(() => {
    fetchPopularVideos();
  }, [fetchPopularVideos]);

  const showNotice = (message) => {
    setNotice(message);

    window.clearTimeout(showNotice.timer);

    showNotice.timer = window.setTimeout(() => {
      setNotice("");
    }, 2200);
  };

  const openVideo = (video) => {
    setSelectedVideo(video);

    setHistory((prev) => [
      video,
      ...prev.filter((v) => v.id !== video.id)
    ].slice(0, 50));
  };

  const toggleWatchLater = (video) => {
    setWatchLater((prev) => {
      const exists = prev.some((v) => v.id === video.id);

      showNotice(
        exists
          ? "Keyinroq ro‘yxatidan olib tashlandi"
          : "Keyinroq saqlandi"
      );

      return exists
        ? prev.filter((v) => v.id !== video.id)
        : [video, ...prev].slice(0, 100);
    });
  };

  const handleSearch = () => {
    searchYouTube(search);
  };

  const handleCategory = (category) => {
    setActive(category);

    if (category === "Hammasi") {
      fetchPopularVideos();
      return;
    }

    if (category === "Tomosha qilingan") {
      setSearchMode(false);
      setError("");
      setVideos(history);
      setLoading(false);
      return;
    }

    if (category === "Keyinroq") {
      setSearchMode(false);
      setError("");
      setVideos(watchLater);
      setLoading(false);
      return;
    }

    searchYouTube(
      categoryQueries[category] || category
    );
  };

  const displayedVideos = useMemo(
    () => videos,
    [videos]
  );

  return (
    <div className={dark ? "app dark" : "app light"}>
      <header className="topbar">
        <div className="brand-area">
          <button
            className="icon-btn"
            onClick={() => setSidebar(!sidebar)}
            aria-label="Menyu"
          >
            <Menu size={25} />
          </button>

          <div className="logo">
            <span className="logo-play">▶</span>
            <span>VibeTube</span>
          </div>
        </div>

        <div className="search-wrap">
          <div className="search-box">
            <Search size={20} />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && handleSearch()
              }
              placeholder="Qidiruv"
              aria-label="YouTube qidiruvi"
            />

            {search && (
              <button
                className="clear"
                onClick={() => {
                  setSearch("");
                  fetchPopularVideos();
                }}
              >
                <X size={17} />
              </button>
            )}
          </div>

          <button
            className="search-btn"
            onClick={handleSearch}
            aria-label="Qidirish"
          >
            <Search size={22} />
          </button>

          <button
            className="mic-btn"
            onClick={() =>
              showNotice(
                "Ovozli qidiruv demo rejimida"
              )
            }
            aria-label="Ovozli qidiruv"
          >
            <Mic size={21} />
          </button>
        </div>

        <div className="top-actions">
          <button
            className="create-btn"
            onClick={() =>
              showNotice(
                "Yaratish funksiyasi demo rejimida"
              )
            }
          >
            <Plus size={21} />
            Yaratish
          </button>

          <button
            className="icon-btn bell"
            onClick={() =>
              showNotice("Yangi bildirishnomalar yo‘q")
            }
          >
            <Bell size={21} />
            <span>9+</span>
          </button>

          <button className="profile">B</button>
        </div>
      </header>

      <div className="layout">
        <aside
          className={
            sidebar ? "sidebar open" : "sidebar"
          }
        >
          <SideItem
            icon={<Home />}
            text="Asosiy"
            active={active === "Hammasi"}
            onClick={() => handleCategory("Hammasi")}
          />

          <SideItem
            icon={<PlaySquare />}
            text="Shorts"
            onClick={() => searchYouTube("shorts")}
          />

          <div className="line" />

          <div className="side-title">
            Obunalar <ChevronRight size={17} />
          </div>

          {subscriptions.map(
            ([name, avatar], i) => (
              <div
                className="subscription"
                key={name}
                onClick={() =>
                  searchYouTube(name)
                }
              >
                <img src={avatar} alt="" />
                <span>{name}</span>

                {i > 1 && i < 6 && <i />}
              </div>
            )
          )}

          <div className="more">
            <ChevronDown size={19} />
            Yana
          </div>

          <div className="line" />

          <div className="side-title">
            Siz <ChevronRight size={17} />
          </div>

          <SideItem
            icon={<History />}
            text="Tomosha tarixi"
            onClick={() => {
              setActive("Tomosha qilingan");
              setVideos(history);
              setSearchMode(false);
            }}
          />

          <SideItem
            icon={<Bookmark />}
            text="Keyinroq"
            onClick={() => {
              setActive("Keyinroq");
              setVideos(watchLater);
              setSearchMode(false);
            }}
          />

          <SideItem
            icon={<ListVideo />}
            text="Playlistlar"
            onClick={() =>
              showNotice(
                "Playlistlar demo rejimida"
              )
            }
          />

          <SideItem
            icon={<ThumbsUp />}
            text="Yoqqan videolar"
            onClick={() =>
              showNotice(
                "Yoqqan videolar demo rejimida"
              )
            }
          />

          <SideItem
            icon={<Film />}
            text="Videolaringiz"
            onClick={() =>
              showNotice(
                "Videolaringiz bo‘limi demo rejimida"
              )
            }
          />

          <SideItem
            icon={<Download />}
            text="Yuklanmalar"
            onClick={() =>
              showNotice(
                "Yuklab olish YouTube tomonidan boshqariladi"
              )
            }
          />

          <div className="line" />

          <p className="footer-text">
            VibeTube © 2026
          </p>
        </aside>

        <main
          className={
            sidebar ? "main" : "main full"
          }
        >
          <div className="chips">
            {categories.map((category) => (
              <button
                key={category}
                className={
                  active === category
                    ? "chip active"
                    : "chip"
                }
                onClick={() =>
                  handleCategory(category)
                }
              >
                {category}
              </button>
            ))}
          </div>

          {error && (
            <div className="empty">
              <h2>YouTube API xatosi</h2>

              <p>{error}</p>

              <button
                className="retry-btn"
                onClick={() =>
                  fetchPopularVideos()
                }
              >
                <RefreshCw size={17} />
                Qayta urinish
              </button>
            </div>
          )}

          {!error && loading && (
            <div className="empty">
              <h2>
                Videolar yuklanmoqda...
              </h2>

              <p>
                YouTube’dan ma’lumot olinmoqda.
              </p>
            </div>
          )}

          {!error && !loading && (
            <>
              <div className="content-heading">
                <h1>
                  {searchMode
                    ? `“${search.trim()}” uchun natijalar`
                    : active === "Hammasi"
                    ? "Siz uchun tavsiya"
                    : active}
                </h1>

                <span>
                  {displayedVideos.length} ta video
                </span>
              </div>

              <div className="video-grid">
                {displayedVideos.length ? (
                  displayedVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onClick={() =>
                        openVideo(video)
                      }
                      onSave={() =>
                        toggleWatchLater(video)
                      }
                      saved={watchLater.some(
                        (v) => v.id === video.id
                      )}
                    />
                  ))
                ) : (
                  <div className="empty">
                    <Search size={52} />

                    <h2>
                      Hech narsa topilmadi
                    </h2>

                    <p>
                      Qidiruv so‘zini o‘zgartirib
                      ko‘ring.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <button
        className="theme-toggle"
        onClick={() => setDark(!dark)}
      >
        {dark ? "☀" : "☾"}
      </button>

      {notice && (
        <div className="toast">
          {notice}
        </div>
      )}

      {selectedVideo && (
        <div
          className="player-overlay"
          onClick={() =>
            setSelectedVideo(null)
          }
        >
          <div
            className="player-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="player-close">
              <button
                className="icon-btn"
                onClick={() =>
                  setSelectedVideo(null)
                }
              >
                <X />
              </button>
            </div>

            <div className="player-frame">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0`}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            <div className="player-info">
              <h2>
                {selectedVideo.title}
              </h2>

              <p>
                {selectedVideo.channel} •{" "}
                {selectedVideo.views} •{" "}
                {selectedVideo.time}
              </p>

              <div className="player-actions">
                <button
                  onClick={() =>
                    toggleWatchLater(
                      selectedVideo
                    )
                  }
                >
                  <Bookmark size={18} />

                  {watchLater.some(
                    (v) =>
                      v.id === selectedVideo.id
                  )
                    ? "Saqlangan"
                    : "Keyinroq"}
                </button>

                <a
                  href={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={18} />
                  YouTube’da ochish
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SideItem({
  icon,
  text,
  active,
  onClick
}) {
  return (
    <div
      className={
        active
          ? "side-item active"
          : "side-item"
      }
      onClick={onClick}
    >
      {React.cloneElement(icon, {
        size: 21
      })}

      <span>{text}</span>
    </div>
  );
}

function VideoCard({
  video,
  onClick,
  onSave,
  saved
}) {
  return (
    <article
      className="video-card"
      onClick={onClick}
    >
      <div className="thumbnail">
        <img
          src={video.thumb}
          alt={video.title}
          loading="lazy"
        />

        <span className="duration">
          {video.duration}
        </span>

        <button
          className="save-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          title={
            saved
              ? "Saqlangan"
              : "Keyinroq saqlash"
          }
        >
          <Bookmark
            size={18}
            fill={
              saved
                ? "currentColor"
                : "none"
            }
          />
        </button>

        <button
          className="more-btn"
          onClick={(e) =>
            e.stopPropagation()
          }
          aria-label="Ko‘proq"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="video-info">
        <img
          className="avatar"
          src={video.avatar}
          alt=""
          loading="lazy"
        />

        <div className="details">
          <h3>{video.title}</h3>

          <p>{video.channel}</p>

          <p>
            {video.views} • {video.time}
          </p>
        </div>
      </div>
    </article>
  );
}

function formatViews(value) {
  if (!value) return "0";

  const n = Number(value);

  if (n >= 1e9)
    return (
      (n / 1e9).toFixed(1) +
      " mlrd"
    );

  if (n >= 1e6)
    return (
      (n / 1e6).toFixed(1) +
      " mln"
    );

  if (n >= 1e3)
    return (
      (n / 1e3).toFixed(1) +
      " ming"
    );

  return n.toString();
}

function formatDate(date) {
  if (!date) return "";

  const days = Math.max(
    0,
    Math.floor(
      (Date.now() -
        new Date(date).getTime()) /
        86400000
    )
  );

  if (days === 0) return "bugun";
  if (days === 1) return "1 kun oldin";

  if (days < 30)
    return `${days} kun oldin`;

  const months = Math.floor(
    days / 30
  );

  if (months < 12)
    return `${months} oy oldin`;

  return `${Math.floor(
    months / 12
  )} yil oldin`;
}

function formatDuration(duration) {
  if (!duration) return "0:00";

  const m = duration.match(
    /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
  );

  if (!m) return "0:00";

  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  const s = Number(m[3] || 0);

  if (h) {
    return `${h}:${String(min).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
  }

  return `${min}:${String(s).padStart(
    2,
    "0"
  )}`;
}

createRoot(
  document.getElementById("root")
).render(<App />);