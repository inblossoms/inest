import "reflect-metadata";
import { MODULE_ISOLATION } from "./constants";

export function SetMetadata(module, metadata = []) {
   metadata.forEach((metadata) => {
      Reflect.defineMetadata(MODULE_ISOLATION, module, metadata);
   });
}
