import { Injectable } from "@/packages/common/index";

@Injectable()
export class ProductsService {
   constructor() {}

   products(product) {
      console.log("PRODUCTS: ", product);
      return "PRODUCT: " + product;
   }
}
