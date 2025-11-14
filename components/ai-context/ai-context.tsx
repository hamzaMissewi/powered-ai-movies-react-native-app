// Using Groq with proper imports for ai@5.0.93
import { groq } from "@ai-sdk/groq";
import { type CoreMessage } from "ai";
// import { Message, streamText } from "ai";
import { createAI, getMutableAIState, streamUI } from "ai/rsc/dist";
import "server-only";
import { z } from "zod";

import { unstable_headers } from "expo-router/rsc/headers";
import { getPlacesInfo } from "../map/googleapis-maps";
import { MapCard, MapSkeleton } from "../map/map-card";
import MarkdownText from "../markdown-text";
import { MoviesCard, MoviesSkeleton } from "../movies/movie-card";
import { WeatherCard } from "../weather";
import { getWeatherAsync } from "../weather-data";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is required");
}

export async function onSubmit(message: string) {
  "use server";

  const aiState = getMutableAIState();

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: "user",
        content: message,
      },
    ],
  });

  const headers = await unstable_headers();

  const tools: Record<string, any> = {};

  // The map feature is native only for now.
  if (process.env.EXPO_OS !== "web") {
    tools.get_points_of_interest = {
      description: "Get things to do for a point of interest or city",
      parameters: z
        .object({
          poi: z
            .string()
            .describe(
              'query to send to the Google Places API. e.g. "things to do in Amsterdam" or "casinos and hotels in Las Vegas"'
            ),
        })
        .required(),
      async *generate({ poi }: { poi: string }) {
        console.log("city", poi);
        yield <MapSkeleton />;

        let pointsOfInterest = await getPlacesInfo(poi);

        return <MapCard city={poi} data={pointsOfInterest} />;
      },
    };
  }

  // const result = await streamText({
  const result = await streamUI({
    // Use Groq with Llama 3.1 70B - best for tool calling
    // model: groq("llama-3.1-70b-versatile"),
    // model: 'mixtral-8x7b-32768',
    model: groq("llama-3.1-8b-instant"),
    // model: groq("gemma2-9b-it"),

    // Alternative options:
    // model: groq("llama-3.3-70b-versatile"), // Newest Llama model
    // model: groq("llama3-70b-8192"), // Older version
    // model: groq("mixtral-8x7b-32768"), // Mixtral alternative

    messages: [
      {
        role: "system",
        content: `\
You are a helpful chatbot assistant. You can provide weather info and movie recommendations. 
You have the following tools available:
- get_media: Lists or search movies and TV shows from TMDB.
- get_weather: Gets the weather for a city.

User info:
- city: ${
          headers.get("eas-ip-city") ??
          (process.env.__DEV__ ? "Austin" : "unknown")
        }
- country: ${
          headers.get("eas-ip-country") ??
          (process.env.__DEV__ ? "US" : "unknown")
        }
- region: ${
          headers.get("eas-ip-region") ??
          (process.env.__DEV__ ? "TX" : "unknown")
        }
- device platform: ${headers.get("expo-platform") ?? "unknown"}
`,
      },
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name,
      })),
    ],
    text: ({ content, done }: { content: string; done: boolean }) => {
      if (done) {
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: "assistant",
              content,
            },
          ],
        });
      }
      return <MarkdownText done={done}>{content}</MarkdownText>;
    },
    tools: {
      ...tools,
      get_media: {
        description: "List movies or TV shows today or this week from TMDB",
        parameters: z
          .object({
            time_window: z
              .enum(["day", "week"])
              .describe("time window to search for")
              .default("day"),
            media_type: z
              .enum(["tv", "movie"])
              .describe("type of media to search for")
              .default("movie"),
            generated_description: z
              .string()
              .describe("AI-generated description of the tool call"),
            query: z
              .string()
              .describe(
                "The query to use for searching movies or TV shows. Set to undefined if looking for trending, new, or popular media."
              )
              .optional(),
          })
          .required(),
        async *generate({
          generated_description,
          time_window,
          media_type,
          query,
        }: {
          generated_description: string;
          time_window: "day" | "week";
          media_type: "tv" | "movie";
          query?: string;
        }) {
          yield <MoviesSkeleton />;

          let url: string;
          if (query) {
            url = `https://api.themoviedb.org/3/search/${media_type}?api_key=${
              process.env.TMDB_API_KEY
            }&query=${encodeURIComponent(query)}`;
          } else {
            url = `https://api.themoviedb.org/3/trending/${media_type}/${time_window}?api_key=${process.env.TMDB_API_KEY}`;
          }

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error("Failed to fetch trending movies");
          }
          const data = await response.json();
          const movies = data.results.map((media: any) => {
            if (!media.media_type) {
              media.media_type = media_type;
            }
            return media;
          });
          return <MoviesCard data={movies} title={generated_description} />;
        },
      },
      get_weather: {
        description: "Get the current weather for a city",
        parameters: z
          .object({
            city: z.string().describe("the city to get the weather for"),
          })
          .required(),
        async *generate({ city }: { city: string }) {
          yield <WeatherCard city={city} />;

          const weatherInfo = await getWeatherAsync(city);
          console.log("weatherInfo", JSON.stringify(weatherInfo));
          return <WeatherCard city={city} data={weatherInfo} />;
        },
      },
    },
  });

  return {
    id: nanoid(),
    display: result.value,
  };
}

const nanoid = () => Math.random().toString(36).slice(2);

export type Message = CoreMessage & {
  id: string;
};

export type AIState = {
  chatId: string;
  messages: Message[];
};

export type UIState = {
  id: string;
  display: React.ReactNode;
}[];

const actions = {
  onSubmit,
} as const;

export const AI = createAI<AIState, UIState, typeof actions>({
  actions,
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
});
