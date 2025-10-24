import type { Route } from "./+types/home";
import { HomePage } from "~/pages/@home/HomePage";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Home Page" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return <HomePage />;
}
