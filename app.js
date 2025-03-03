import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { createClient } from "@supabase/supabase-js";


dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const supabase = createClient(process.env.SUPABASE_URL_KEY, process.env.SUPABASE_API_KEY);

app.use(cors());

app.get("/api/movies/:imdbid", async (req, res) => {
  try {
      const { imdbid } = req.params;
      const movie = await getMovie(imdbid);

      if (!movie) {
          return res.status(404).json({ error: "Фильм не найден" });
      }

      res.json(movie);
  } catch (error) {
      console.error("Ошибка в обработчике:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

async function getMovie(imdbID) {
  try {
      let movie = await getMovieFromCache(imdbID);

      if (!movie) {
          const response = await fetch(`https://www.omdbapi.com/?i=${imdbID}&apikey=${process.env.OMDB_API_KEY}`);

          if (!response.ok) {
              console.error("Ошибка запроса в OMDB:", response.status, response.statusText);
              return null;
          }

          movie = await response.json();

          if (movie?.Response === "True" && movie.Title) {
              await saveMovieToCache(imdbID, movie);
          } else {
              console.warn("Фильм не найден в OMDB:", movie?.Error);
              return null;
          }
      }

      return movie;
  } catch (error) {
      console.error("Ошибка getMovie:", error);
      return null;
  }
}

async function getMovieFromCache(imdbID) {
  try {
      const { data, error } = await supabase
          .from("movie_cache")
          .select("data, updated_at")
          .eq("imdbid", imdbID)
          .maybeSingle();

      if (error) {
          console.error("Ошибка при запросе кэша:", error);
          return null;
      }

      if (data && new Date() - new Date(data.updated_at) < 24 * 60 * 60 * 1000 * 7) {
          return data.data;
      }

      return null;
  } catch (error) {
      console.error("Ошибка в getMovieFromCache:", error);
      return null;
  }
}

async function saveMovieToCache(imdbID, movieData) {
  try {
      const { error } = await supabase
          .from("movie_cache")
          .upsert({
              imdbid: imdbID,
              data: movieData,
              updated_at: new Date().toISOString(),
          });

      if (error) {
          console.error("Ошибка при сохранении в кэш:", error);
      }
  } catch (error) {
      console.error("Ошибка в saveMovieToCache:", error);
  }
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
