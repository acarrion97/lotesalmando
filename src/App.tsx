import { AppRouter } from "./app/router/AppRouter";
import { UpdatePrompt } from "@/presentation/components/layout/UpdatePrompt";

export function App() {
  return (
    <>
      <AppRouter />
      <UpdatePrompt />
    </>
  );
}
