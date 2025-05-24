import {
   Controller,
   Get,
   HttpException,
   HttpStatus,
} from "@/packages/common/index";
import { ProductsService } from "../products/products.service";

@Controller("filter")
export class FilterController {
   constructor(private readonly productsService: ProductsService) {}

   @Get("http-exception")
   getHttpException() {
      console.log("FilterController: getHttpException");

      throw new HttpException(
         {
            status: HttpStatus.BAD_REQUEST,
            error: "This is a global filter test error",
         },
         HttpStatus.BAD_REQUEST
      );
   }

   @Get("error")
   getError() {
      console.log("FilterController: getError");

      throw new Error("This is a test error for global filter");
   }

   @Get("custom")
   getCustomError() {
      console.log("FilterController: getCustomError");

      throw new HttpException(
         {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: "Custom error message",
            timestamp: new Date().toISOString(),
         },
         HttpStatus.INTERNAL_SERVER_ERROR
      );
   }

   @Get("products")
   getProducts() {
      return this.productsService.products("Test Product from Filter");
   }
}
