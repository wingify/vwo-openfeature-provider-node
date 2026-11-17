/**
 * Copyright 2026 Wingify Software Pvt. Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  ErrorCode,
  ErrorWithCode,
  OpenFeatureEventEmitter,
  ProviderEvents,
  StandardResolutionReasons,
  type EvaluationContext,
  type Hook,
  type JsonValue,
  type Logger,
  type Provider,
  type ResolutionDetails,
} from '@openfeature/server-sdk';
import { isValidObject } from '@self/utils';
import {
  init as buildClient,
  type IWingifyClient,
  type IWingifyOptions,
} from 'wingify-fme-node-sdk';

import { } from 'wingify-fme-node-sdk/node';

type EvaluationType = 'string' | 'boolean' | 'number' | 'object';
type WingifyVariableType = 'string' | 'boolean' | 'float' | 'double' | 'int' | 'integer' | 'json';
type WingifyVariable = {
  getKey(): string;
  getType(): WingifyVariableType;
  getValue(): unknown;
}

/**
 * Implement the OpenFeature provider interface to integrate with the Wingify platform
 */
export class WingifyProvider implements Provider {
  // Adds runtime validation that the provider is used with the expected SDK
  public readonly runsOn = 'server';
  // OpenFeature provider metadata
  readonly metadata = {
    name: 'wingify-openfeature-provider-node',
  } as const;
  // Optional provider managed hooks
  hooks: Hook[] = [];
  // event emitter for OpenFeature SDK
  events = new OpenFeatureEventEmitter();

  readonly #clientOptions: IWingifyOptions;
  #client?: IWingifyClient;

  /**
   * Construct a Wingify Provider for OpenFeature
   * @param {IWingifyOptions} options The `IWingifyOptions` to use when initializing the `WingifyClient` during the `initialize()` phase
   */
  constructor(options: IWingifyOptions) {
    this.#clientOptions = options;
  }

  /**
   * Validate the `IWingifyOptions` provided
   * @param options 
   */
  #validateOptions(options: IWingifyOptions) {
    if (!isValidObject(options))
      throw new Error('The provided options must be a valid object that implements the IWingifyOptions interface.');
    if (typeof options.sdkKey !== 'string' || options.sdkKey.length === 0)
      throw new Error('The provided options must contain a non-empty string value for `sdkKey`.');
    if (typeof options.accountId !== 'string' || options.accountId.length === 0)
      throw new Error('The provided options must contain a non-empty string value for `accountId`.');
  }

  public async initialize(context?: EvaluationContext, domain?: string): Promise<void> {
    try {
        this.#client = await buildClient(this.#clientOptions);
        this.events.emit(ProviderEvents.Ready);
    } catch(err) {
        this.events.emit(ProviderEvents.Error);
    }
  }

  public async onClose(): Promise<void> {
    try {
    } catch(err) {

    }
      await this.#client?.shutdown();
  }

  #isExpectedValueType<T>(value: unknown, expectedType: EvaluationType, actualType: WingifyVariableType): value is T {
    switch (expectedType) {
      case 'boolean': return actualType === 'boolean' && typeof value === 'boolean';
      case 'number':
        return (actualType === 'int' || actualType === 'integer' || actualType === 'float' || actualType === 'double') && typeof value === 'number';
      case 'string': return actualType === 'string' && typeof value === 'string';
      case 'object': return actualType === 'json' && isValidObject(value);
      default: return false;
    }
  }

  async #resolveEvaluation<T>(expectedType: EvaluationType, flagKey: string, ctx: EvaluationContext, defaultValue: T, logger: Logger): Promise<ResolutionDetails<T>> {
    try {
      // We first validate the evaluation context
      if (ctx.key !== null && ctx.key !== undefined && typeof ctx.key !== 'string')
        throw new ErrorWithCode(ErrorCode.INVALID_CONTEXT, `The 'key' in evaluation context must be a string.`);
      if (!ctx.key && expectedType !== 'object' && expectedType !== 'boolean')
        throw new ErrorWithCode(ErrorCode.TYPE_MISMATCH, `Expected flag '${flagKey}' to be of type object or boolean, got ${expectedType}.`);
      // We retrieve the flag
      const flag = await this.#client!.getFlag(flagKey, ctx);
      if (!flag.isEnabled())
        // NOTE: currently is not possible to understand if a Flag is disabled because didn't match a tergeting rule,
        // or because it's really disabled or because is not available in the catalog,
        // so for now we use only DISABLED as a reason.
        // TODO: Suggestion to Wingify developers is to expose an additional property on Flag that tell the reason
        // of why it's disabled/enabled or some similar info that will make easier to integrate with OpenFeature specs
        // and provide meaningful info through ResolutionDetails objects.
        return { value: expectedType === 'boolean' ? false as T : defaultValue, reason: StandardResolutionReasons.DISABLED };
      // When flag is enabled, we try to get the associated variation, if any, to understand the reason behind the flag value
      // NOTE: this is a workaround since currently there is not exposed API to get the variation info from the Flag.
      // TODO: Suggestion to Wingify developers is to expose an additional property to get the variation info (key, name, etc.)
      const flagVariation = flag['variation'];
      const variantKey = typeof flagVariation?.getKey === 'function' ? flagVariation.getKey() : 'default';
      const flagVariables = flag.getVariables() as WingifyVariable[];
      // We check if we are targeting a specific variable or the whole set
      if (ctx.key) {
        for (const variable of flagVariables) {
          if (variable.getKey() === ctx.key) {
            const variableValue = variable.getValue();
            if (this.#isExpectedValueType<T>(variableValue, expectedType, variable.getType()))
              return { value: variableValue, variant: variantKey, reason: 'TARGETING_MATCH' };
            else throw new ErrorWithCode(ErrorCode.TYPE_MISMATCH, `Expected flag '${flagKey}|${ctx.key}' to be of type ${expectedType}, got ${variable.getType()}.`)
          }
        }
        // If we are here, we return the default value
        return { value: defaultValue, variant: variantKey, reason: 'DEFAULT' };
      }
      // If we wanted a boolean value, we return `true` directly
      if (expectedType === 'boolean')
        return { value: true as T, variant: variantKey, reason: 'TARGETING_MATCH' };
      // If we are here, it means that we can resolve the whole variables set
      const variablesDictionary = Object.create(null) as T;
      for (const variable of flagVariables) {
        variablesDictionary[variable.getKey()] = variable.getValue();
      }
      return { value: variablesDictionary, variant: variantKey, reason: 'TARGETING_MATCH' };
    } catch(err) {
      if (err instanceof ErrorWithCode)
        return {value: defaultValue, errorCode: err.code, errorMessage: err.message, reason: 'ERROR' };
      else
        return {
          value: undefined as T,
          reason: StandardResolutionReasons.ERROR,
          errorCode: ErrorCode.GENERAL,
          errorMessage: err instanceof Error ? err.message : `${err}`
        };
    }
  }

  /**
   * Returns the variable value of type boolean for a given feature
   *
   * If variable value is not evaluated, default value will be returned
   *
   * @param flagKey The unique key of the feature flag.
   * @param defaultValue The default value of the variable
   * @param context The context containing user info and variable-key
   * @returns A promise that resolves to a ResolutionDetails having boolean type
   */
  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<boolean>> {
    return this.#resolveEvaluation('boolean', flagKey, context, defaultValue, logger);
  }

  /**
   * Returns the variable value of type string for a given feature
   *
   * If variable value is not evaluated, default value will be returned
   *
   * @param flagKey The unique key of the feature flag.
   * @param defaultValue The default value of the variable
   * @param context The context containing user info and variable-key
   * @returns A promise that resolves to a ResolutionDetails having string type
   */
  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<string>> {
    return this.#resolveEvaluation('string', flagKey, context, defaultValue, logger);
  }

  /**
   * Returns the variable value of type number|double for a given feature
   *
   * If variable value is not evaluated, default value will be returned
   *
   * @param flagKey The unique key of the feature flag.
   * @param defaultValue The default value of the variable
   * @param context The context containing user info and variable-key
   * @returns A promise that resolves to a ResolutionDetails having number|double type
   */
  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<number>> {
    return this.#resolveEvaluation('number', flagKey, context, defaultValue, logger);
  }

  /**
   * Returns the variable value of type JSON for a given feature
   *
   * If variable value is not evaluated, return defaultValue
   * If variable value is evaluated but variable-key is not provided inside context,
   *  return all the variables
   * Otherwise, default value will be returned
   *
   * @param flagKey The unique key of the feature flag.
   * @param defaultValue The default value of the variable
   * @param context The context containing user info and variable-key
   * @returns A promise that resolves to a ResolutionDetails having JSON type
   */
  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<T>> {
    return this.#resolveEvaluation('object', flagKey, context, defaultValue, logger);
  }

  /**
   * Return the `IWingifyClient` instance created and used by this OpenFeature provider
   *
   * @returns The client for this provider.
   */
  public getClient(): IWingifyClient | undefined {
    return this.#client;
  }
}
