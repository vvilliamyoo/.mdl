import { mount } from "svelte";
import "./app.css";
import { applyTheme } from "./lib/theme.js";
import { initializeAppStore } from "./lib/appStore.js";
import App from "./App.svelte";
import defaultConfigText from "virtual:mdl-default-config";

const appTarget = document.getElementById("app");

if (!appTarget) {
  throw new Error("App target element #app not found");
}

const target = appTarget;

/** @param {HTMLElement} appTargetElement */
async function startApp(appTargetElement) {
  try {
    const config = await initializeAppStore(import.meta.env.BASE_URL, defaultConfigText);
    applyTheme(config.theme);
    appTargetElement.replaceChildren();
    mount(App, { target: appTargetElement });
  } catch (error) {
    console.error("Failed to initialize the application", error);
    const status = document.createElement("div");
    status.className = "startup-status";
    status.setAttribute("role", "alert");
    status.textContent = "The application could not be initialized. Refresh the page to try again.";
    appTargetElement.replaceChildren(status);
  }
}

void startApp(target);
