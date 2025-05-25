import { APP_FILTER } from "../constants";
import { ProviderCollector } from "../providers/provider-collector";
import { Logger } from "../logger-server";

export class FilterManager {
   constructor(
      private readonly providerCollector: ProviderCollector,
      private readonly exceptionFilterManager: any
   ) {}

   public initializeFilters() {
      const globalFilters =
         this.providerCollector.getProvidersByToken(APP_FILTER);
      if (globalFilters.length > 0) {
         this.exceptionFilterManager.addGlobalFilters(...globalFilters);
      }
   }
}
