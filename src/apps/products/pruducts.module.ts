import { Module } from "@/packages/common/index";
import { ProductsService } from "./products.service";
import { Global } from "@/packages/common/decorators/modules";

@Global()
@Module({
   providers: [ProductsService],
   exports: [ProductsService],
})
export class ProductsModule {}
