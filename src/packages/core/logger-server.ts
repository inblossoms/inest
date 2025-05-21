import * as clc from "cli-color";

export class Logger {
   private static lastLogTime = Date.now();

   static log(message: string, context: string = "") {
      const timestamp = new Date().toLocaleString();
      const pid = process.pid;
      const currentTime = Date.now();
      const timeDiff = currentTime - this.lastLogTime;

      console.log(
         `${clc.green("[Nest]")} ${clc.green(
            pid.toString()
         )} - ${timestamp}      ${clc.green("LOG")} ${clc.yellow(
            `[${context}]`
         )} ${clc.green(message)} ${clc.yellow(`+${timeDiff}ms`)}`
      );

      this.lastLogTime = currentTime;
   }

   static error(message: string, trace: string = "", context: string = "") {
      const timestamp = new Date().toLocaleString();
      const pid = process.pid;
      const currentTime = Date.now();
      const timeDiff = currentTime - this.lastLogTime;

      console.error(
         `${clc.red("[Nest]")} ${clc.red(
            pid.toString()
         )} - ${timestamp}      ${clc.red("ERROR")} ${clc.yellow(
            `[${context}]`
         )} ${clc.red(message)} ${clc.yellow(`+${timeDiff}ms`)} ${
            trace ? clc.red(trace) : ""
         }` // Include stack trace if provided
      );

      this.lastLogTime = currentTime;
   }
}

// [Nest] 10804  - 2025/05/14 17:24:06     LOG [RoutesResolver] AppController {/app}: +8ms
// [Nest] 10804  - 2025/05/14 17:24:06     LOG [RouterExplorer] Mapped {/app, GET} route +4ms
// [Nest] 10804  - 2025/05/14 17:24:06     LOG [NestApplication] Nest application successfully started +3ms
