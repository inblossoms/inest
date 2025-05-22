import { MiddlewareConsumer } from "./middleware";

/**
 * @publicApi
 */
export interface NestModule {
   configure(consumer: MiddlewareConsumer);
}
