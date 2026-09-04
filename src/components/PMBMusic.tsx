"use client";

import { useEffect, useRef } from "react";

const SONGS = [
  "/music/After%20Hours.mp3",
  "/music/OMAR.mp3",
  "/music/STALINE.mp3",
  "/music/Storm.mp3",
];

export function PMBMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSongRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    const savedVol = typeof window !== "undefined" ? localStorage.getItem("pmb-music-volume") : null;
    audio.volume = savedVol !== null ? Math.max(0, Math.min(1, parseFloat(savedVol))) : 0.35;
    audio.preload = "auto";

    audioRef.current = audio;

    function broadcastState() {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent("pmb-music-state", {
          detail: {
            isPlaying: !audio.paused,
            volume: audio.volume,
            currentTrack: audio.src
              ? decodeURIComponent(audio.src.split("/").pop() || "").replace(".mp3", "")
              : "",
          },
        })
      );
    }

    function getRandomSong() {
      let song: string;

      do {
        song =
          SONGS[Math.floor(Math.random() * SONGS.length)];
      } while (
        SONGS.length > 1 &&
        song === lastSongRef.current
      );

      lastSongRef.current = song;

      return song;
    }

    async function playRandomSong() {
      const song = getRandomSong();

      audio.src = song;

      try {
        await audio.play();
        broadcastState();
      } catch {
        // Browser blocked autoplay.
        // Login interaction will unlock playback.
      }
    }

    function startMusicFromLogin() {
      if (
        sessionStorage.getItem("pmb-music-started") !== "true"
      ) {
        return;
      }

      if (!audio.paused) {
        return;
      }

      playRandomSong();
    }

    function handleSetVolume(e: any) {
      if (typeof e.detail?.volume === "number") {
        const vol = Math.max(0, Math.min(1, e.detail.volume));
        audio.volume = vol;
        localStorage.setItem("pmb-music-volume", String(vol));
        broadcastState();
      }
    }

    function handleToggleMusic() {
      if (audio.paused) {
        if (!audio.src) {
          playRandomSong();
        } else {
          audio.play().catch(() => {});
        }
      } else {
        audio.pause();
      }
      setTimeout(broadcastState, 50);
    }

    function handleNextTrack() {
      playRandomSong();
    }

    function handleRequestState() {
      broadcastState();
    }

    audio.addEventListener("ended", playRandomSong);
    audio.addEventListener("play", broadcastState);
    audio.addEventListener("pause", broadcastState);

    /*
     * If the user has already logged in during this session,
     * start the music.
     */
    if (
      sessionStorage.getItem("pmb-music-started") === "true"
    ) {
      playRandomSong();
    }

    /*
     * Listen for the login interaction.
     * This allows the browser to accept audio playback.
     */
    function stopMusic() {
      audio.pause();
      broadcastState();
    }

    function resumeMusic() {
      if (sessionStorage.getItem("pmb-music-started") === "true" && audio.paused && audio.src) {
        audio.play().catch(() => {});
      }
    }

    /*
     * Listen for external pause/stop and resume events (e.g. entering Live Auctions).
     */
    window.addEventListener("pmb-start-music", startMusicFromLogin);
    window.addEventListener("pmb-pause-music", stopMusic);
    window.addEventListener("pmb-stop-music", stopMusic);
    window.addEventListener("pmb-resume-music", resumeMusic);
    window.addEventListener("pmb-set-volume", handleSetVolume);
    window.addEventListener("pmb-toggle-music", handleToggleMusic);
    window.addEventListener("pmb-next-track", handleNextTrack);
    window.addEventListener("pmb-request-music-state", handleRequestState);

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("ended", playRandomSong);
      audio.removeEventListener("play", broadcastState);
      audio.removeEventListener("pause", broadcastState);

      window.removeEventListener("pmb-start-music", startMusicFromLogin);
      window.removeEventListener("pmb-pause-music", stopMusic);
      window.removeEventListener("pmb-stop-music", stopMusic);
      window.removeEventListener("pmb-resume-music", resumeMusic);
      window.removeEventListener("pmb-set-volume", handleSetVolume);
      window.removeEventListener("pmb-toggle-music", handleToggleMusic);
      window.removeEventListener("pmb-next-track", handleNextTrack);
      window.removeEventListener("pmb-request-music-state", handleRequestState);

      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  return null;
}