import { Module } from "@/packages/common/index";
import { FilterController } from "./filter.controller";
import { GlobalExceptionFilter } from "./global-exception.filter";
import { APP_FILTER } from "@/packages/core/constants";

@Module({
   controllers: [FilterController],
   providers: [
      {
         provide: APP_FILTER,
         useClass: GlobalExceptionFilter,
      },
   ],
})
export class FilterModule {}
