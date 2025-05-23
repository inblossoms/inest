module.exports = {
   //    projects: ["<rootDir>/src/packages/*"],
   testEnvironment: "node",
   transform: {
      "^.+\\.tsx?$": "ts-jest",
   },
   moduleNameMapper: {
      "^@/(.*)$": "<rootDir>/src/$1",
   },
   testMatch: ["<rootDir>/src/packages/core/test/**/*.spec.ts"],
   rootDir: ".",
};
