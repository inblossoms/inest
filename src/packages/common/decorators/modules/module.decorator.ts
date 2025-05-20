import "reflect-metadata";
import { MODULE_METADATA } from "../../constants";
import { validateModuleKeys } from "../../utils/validata-module-keys.utils";
import { ModuleMetadata } from "../../interfaces/modules/module-metadata.interface";
import { SetMetadata } from "../../set-metadata";

// interface ModduleMetadata {
//    imports?: any[];
//    controllers?: Function[];
//    providers?: any[];
//    exports?: any[];
// }

export function Module(metadata: ModuleMetadata): ClassDecorator {
   const propsKeys = Object.keys(metadata);
   validateModuleKeys(propsKeys);

   return (target: Function) => {
      for (const property in metadata) {
         if (Object.hasOwnProperty.call(metadata, property)) {
            if (property === "controllers" || property === "providers") {
               SetMetadata(target, (metadata as any)[property]);
            }
            Reflect.defineMetadata(
               property,
               (metadata as any)[property],
               target
            );
         }
      }
   };
}

// export function Module(metadata: ModduleMetadata): ClassDecorator {
//    return function (target: Function) {
//       Reflect.defineMetadata(
//          MODULE_METADATA.CONTROLLERS,
//          metadata.controllers,
//          target
//       );

//       Reflect.defineMetadata(
//          MODULE_METADATA.PROVIDERS,
//          metadata.providers,
//          target
//       );

//       Reflect.defineMetadata(MODULE_METADATA.IMPORTS, metadata.imports, target);
//       Reflect.defineMetadata(MODULE_METADATA.EXPORTS, metadata.exports, target);
//    };
// }
