export interface Config {
   APITOKEN: string;
}

export function createDatabaseProviders(entities, options?) {
   const providers = [];
   for (const entity of entities) {
      providers.push({
         provide: entity.provide,
         useValue: entity.useValue,
      });
   }

   return providers;
}
