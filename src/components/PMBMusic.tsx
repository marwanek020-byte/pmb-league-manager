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
    audio.volume = 0.35;
    audio.preload = "auto";

    audioRef.current = audio;

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

    audio.addEventListener("ended", playRandomSong);

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
    window.addEventListener(
      "pmb-start-music",
      startMusicFromLogin,
    );

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("ended", playRandomSong);

      window.removeEventListener(
        "pmb-start-music",
        startMusicFromLogin,
      );

      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  return null;
}