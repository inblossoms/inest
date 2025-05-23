import { InternalServerErrorException } from "../../../common/exceptions/internal-server-error.exception";

describe("InternalServerErrorException", () => {
   it("should create an instance with default message", () => {
      const exception = new InternalServerErrorException();
      expect(exception).toBeInstanceOf(InternalServerErrorException);
      console.log(exception);

      expect(exception.message).toBe("Internal Server Error");
      expect(exception.getStatus()).toBe(500);
   });

   it("should create an instance with custom message", () => {
      const customMessage = "Custom error message";
      const exception = new InternalServerErrorException(customMessage);
      expect(exception.message).toBe(customMessage);
      expect(exception.getStatus()).toBe(500);
   });

   it("should create an instance with custom error object", () => {
      const errorObject = {
         message: "Custom error message",
         error: "Custom error",
         statusCode: 500,
      };
      const exception = new InternalServerErrorException(errorObject);
      expect(exception.message).toBe(errorObject.message);
      expect(exception.getStatus()).toBe(500);
   });

   it("should create an instance with custom error object and message", () => {
      const errorObject = {
         message: "Custom error message",
         error: "Custom error",
         statusCode: 500,
      };
      const customMessage = "Override message";
      const exception = new InternalServerErrorException(
         errorObject,
         customMessage
      );
      console.log("4.", exception);

      expect(exception.message).toBe("Custom error message");
      expect(exception.getStatus()).toBe(500);
   });

   it("should maintain error object properties", () => {
      const errorObject = {
         message: "Custom error message",
         error: "Custom error",
         statusCode: 500,
         additionalInfo: "Some additional info",
      };
      const exception = new InternalServerErrorException(errorObject);
      expect(exception.getResponse()).toEqual(errorObject);
   });
});
