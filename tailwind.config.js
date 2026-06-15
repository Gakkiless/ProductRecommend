/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        linen: "#F6F7F9",
        parchment: "#FFFFFF",
        clay: "#64748B",
        cedar: "#172033",
        copper: "#020617",
        snow: "#E5E7EB",
        sage: "#16A34A",
      },
      boxShadow: {
        songtsam: "0 18px 48px rgba(15, 23, 42, 0.10)",
        soft: "0 8px 24px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "HarmonyOS Sans",
          "Source Han Sans SC",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
