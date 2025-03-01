import { InternalServerErrorException } from "@nestjs/common";
import { IValidation, TypeGuardError } from "typia";

import { IResponseBodyStringifier } from "../../options/IResponseBodyStringifier";

export const get_path_and_stringify =
    (method: string) =>
    (
        ...args: any[]
    ): [string | string[] | undefined, (input: any) => string] => {
        const path: string | string[] | null | undefined =
            args[0] === undefined ||
            typeof args[0] === "string" ||
            Array.isArray(args[0])
                ? args[0]
                : null;
        const functor: IResponseBodyStringifier<any> | undefined =
            path === null ? args[0] : args[1];
        return [path ?? undefined, take(method)(functor)];
    };

const take =
    (method: string) =>
    <T>(functor?: IResponseBodyStringifier<T> | null) => {
        if (functor === undefined)
            throw new Error(
                `Error on nestia.core.${method}(): no stringify function provided.`,
            );
        else if (functor === null) return JSON.stringify;
        else if (functor.type === "stringify") return functor.stringify;
        else if (functor.type === "assert") return assert(functor.assert);
        else if (functor.type === "is") return is(functor.is);
        else if (functor.type === "validate") return validate(functor.validate);
        throw new Error(
            `Error on nestia.core.${method}(): invalid typed stringify function.`,
        );
    };

const assert =
    <T>(closure: (data: T) => string) =>
    (data: T) => {
        try {
            return closure(data);
        } catch (exp) {
            if (exp instanceof TypeGuardError) {
                throw new InternalServerErrorException({
                    path: exp.path,
                    reason: exp.message,
                    expected: exp.expected,
                    value: exp.value,
                    message: MESSAGE,
                });
            }
            throw exp;
        }
    };

const is =
    <T>(closure: (data: T) => string | null) =>
    (data: T) => {
        const result: string | null = closure(data);
        if (result === null) throw new InternalServerErrorException(MESSAGE);
        return result;
    };

const validate =
    <T>(closure: (data: T) => IValidation<string>) =>
    (data: T) => {
        const result: IValidation<string> = closure(data);
        if (result.success === false)
            throw new InternalServerErrorException({
                errors: result.errors,
                message: MESSAGE,
            });
        return result.data;
    };

const MESSAGE = "Response body data is not following the promised type.";
