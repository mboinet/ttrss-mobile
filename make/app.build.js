({
  appDir: "../src",
  baseUrl: "scripts",
  dir: "../build",
  mainConfigFile: '../src/scripts/main.js',
  removeCombined: true,
  modules: [
    {
      name: "main",
      include: ["jquerymobile"],
      exclude: ["conf"]
    }
  ]
})
