import "reflect-metadata";

interface ControllerOptions {
   prefix?: string;
}

export function Controller(): ClassDecorator;
export function Controller(prefix: string): ClassDecorator;
export function Controller(options: ControllerOptions): ClassDecorator;
export function Controller(
   prefixOrOpts?: string | ControllerOptions
): ClassDecorator {
   let options: ControllerOptions = {};

   if (typeof prefixOrOpts === "string") {
      options.prefix = prefixOrOpts;
   } else if (typeof prefixOrOpts === "object") {
      options = prefixOrOpts;
   }

   return function <TFunction extends Function>(
      target: TFunction
   ): TFunction | void {
      Reflect.defineMetadata("prefix", options.prefix || "", target);
   };
}
