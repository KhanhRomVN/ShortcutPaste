import React, { useState, useEffect } from "react";
import { ThemeProvider } from "@/presentation/providers/theme-provider";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "bookmarkManager"
    | "taskManager"
    | "habitManager"
    | "moneyManager"
  >("dashboard");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
          el.isContentEditable)
      )
        return;
      // support top-row and numpad keys
      if (e.key === "1" || e.code === "Digit1" || e.code === "Numpad1") {
        setActiveTab("dashboard");
      }
      if (e.key === "2" || e.code === "Digit2" || e.code === "Numpad2") {
        setActiveTab("bookmarkManager");
      }
      if (e.key === "3" || e.code === "Digit3" || e.code === "Numpad3") {
        setActiveTab("taskManager");
      }
      if (e.key === "4" || e.code === "Digit4" || e.code === "Numpad4") {
        setActiveTab("habitManager");
      }
      if (e.key === "5" || e.code === "Digit5" || e.code === "Numpad5") {
        setActiveTab("moneyManager");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Load persisted activeTab from chrome.storage
  useEffect(() => {
    chrome.storage.local.get(["flexbookmark_active_tab"], (result) => {
      if (
        result.flexbookmark_active_tab &&
        (result.flexbookmark_active_tab === "dashboard" ||
          result.flexbookmark_active_tab === "bookmarkManager" ||
          result.flexbookmark_active_tab === "taskManager" ||
          result.flexbookmark_active_tab === "habitManager" ||
          result.flexbookmark_active_tab === "moneyManager")
      ) {
        setActiveTab(result.flexbookmark_active_tab);
      }
    });
  }, []);

  // Persist activeTab in chrome.storage
  useEffect(() => {
    chrome.storage.local.set({ flexbookmark_active_tab: activeTab });
  }, [activeTab]);

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="min-h-screen flex flex-col "></div>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
