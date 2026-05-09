import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { SmokeTestService } from "@calcom/features/smoke-tests/services/SmokeTestService";

import { SMOKE_TEST_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = SMOKE_TEST_DI_TOKENS.SMOKE_TEST_SERVICE;
const moduleToken = SMOKE_TEST_DI_TOKENS.SMOKE_TEST_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: SmokeTestService,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { SmokeTestService };
