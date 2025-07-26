import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./components/ui/theme-provider.tsx";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./lib/query-client.ts";
import { TaskProvider } from "./lib/contexts/task-context.tsx";
import { Toaster } from "./components/ui/sonner.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TaskProvider>
          <App />
          <Toaster richColors={true}/>
        </TaskProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
);
