import {
    ApplicationCommandInteractionDataOption,
    ApplicationCommandInteractionDataOptionAsTypeSub,
    ApplicationCommandInteractionDataOptionNotTypeNarrowed,
} from 'discord-typings';

export const OptionTypes = {
    SUB_COMMAND: 1,
    SUB_COMMAND_GROUP: 2,
    STRING: 3,
    INTEGER: 4,
    BOOLEAN: 5,
    USER: 6,
    CHANNEL: 7,
    ROLE: 8,
    MENTIONABLE: 9,
    NUMBER: 10,
    ATTACHMENT: 11,
} as const;

export type OptionWithValue = Exclude<
    ApplicationCommandInteractionDataOption,
    | ApplicationCommandInteractionDataOptionAsTypeSub
    | ApplicationCommandInteractionDataOptionNotTypeNarrowed
>;

export type ObjectOption<T extends 6 | 7 | 8 | 9 | 11> = {
    type: T;
    name: string;
    focused?: boolean;
    value: string;
}

export function commandOptionHasValue(
    option: ApplicationCommandInteractionDataOption,
): option is OptionWithValue {
    return ![1, 2, 6, 7, 8, 9, 11].includes(option.type);
}

export function commandOptionIsObject<T extends 6 | 7 | 8 | 9 | 11>(
    type: T,
    option: ApplicationCommandInteractionDataOption,
): option is ObjectOption<T> {
    return option.type === type;
}