import "reflect-metadata";
import { MODULE_ISOLATION } from "./constants";
import { isFunction } from "../shared/shared.utils";

export function SetMetadata(module, metadata = []) {
   metadata.forEach((item) => {
      if (isFunction(item)) {
         Reflect.defineMetadata(MODULE_ISOLATION, module, item);
      } else if (item && typeof item === "object" && item.useClass) {
         Reflect.defineMetadata(MODULE_ISOLATION, module, item.useClass);
      }
   });
}
