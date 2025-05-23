import { ExternalExceptionFilter } from "../../exceptions/external-exception-filter";
import { ArgumentsHost } from "@/packages/common/interfaces/features/arguments-host.interface";
import { IntrinsicException } from "@/packages/common/exceptions/intrinsic.exception";
import { Logger } from "../../logger-server";

jest.mock("../../logger-server", () => ({
   Logger: {
      error: jest.fn(),
   },
}));

describe("ExternalExceptionFilter", () => {
   let filter: ExternalExceptionFilter;
   let mockHost: ArgumentsHost;

   beforeEach(() => {
      filter = new ExternalExceptionFilter();
      mockHost = {
         switchToHttp: jest.fn(),
         switchToRpc: jest.fn(),
         switchToWs: jest.fn(),
         getType: jest.fn(),
         getArgs: jest.fn(),
         getArgByIndex: jest.fn(),
      };
      jest.clearAllMocks();
   });

   describe("catch", () => {
      it("应该记录非 IntrinsicException 的错误信息", () => {
         // 准备测试数据
         const error = new Error("测试错误信息");

         // 执行测试
         expect(() => filter.catch(error, mockHost)).toThrow(error);

         // 验证结果
         expect(Logger.error).toHaveBeenCalledWith(error.message);
      });

      it("不应该记录 IntrinsicException 类型的错误", () => {
         // 准备测试数据
         class TestIntrinsicException extends IntrinsicException {}
         const error = new TestIntrinsicException();

         // 执行测试
         expect(() => filter.catch(error, mockHost)).toThrow(error);

         // 验证结果
         expect(Logger.error).not.toHaveBeenCalled();
      });

      it("应该正确处理非 Error 类型的异常", () => {
         // 准备测试数据
         const nonErrorException = "非错误类型的异常";

         // 执行测试
         expect(() => filter.catch(nonErrorException, mockHost)).toThrow(
            nonErrorException
         );

         // 验证结果
         expect(Logger.error).not.toHaveBeenCalled();
      });
   });
});
