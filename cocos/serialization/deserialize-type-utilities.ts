type EnumMapImpl<
    Map extends Record<number, any>,
    _,
    Minus1 extends any[] = [],
    Index extends keyof Map = Minus1['length']
> = [
    ...(Minus1 extends [infer _2, ...infer Remain] ? EnumMapImpl<Map, _2, Remain> : []),
    // Index,
    Map[Index],
];

type MapTuple<Map extends Record<number, any>, T> = T extends [infer _1, ...infer Remain] ? EnumMapImpl<Map, _1, Remain> : never;

type Tuple<T, N, R extends T[] = []> = R['length'] extends N ? R : Tuple<T, N, [...R, T]>;

export type MapEnum<Map extends Record<number, any>, Length extends number> = MapTuple<Map, Tuple<unknown, Length>>;

type TupleSplit<T, N extends number, O extends readonly any[] = readonly []> =
    O['length'] extends N ? [O, T] : T extends readonly [infer F, ...infer R] ?
    TupleSplit<readonly [...R], N, readonly [...O, F]> : [O, T];

type TakeFirst<T extends readonly any[], N extends number> =
    TupleSplit<T, N>[0];

type SkipFirst<T extends readonly any[], N extends number> =
    TupleSplit<T, N>[1];

export type TupleSlice<T extends readonly any[], S extends number, E extends number = T['length']> =
    SkipFirst<TakeFirst<T, E>, S>;

    /**
用来处理与枚举映射（Record<number, any>）相关的操作。我将逐一分析这些类型定义，并解释它们的作用和如何工作。

1. EnumMapImpl
EnumMapImpl 是一个递归类型，用于将枚举映射（Record<number, any>）转换为一个元组类型，其中元组的元素是映射中对应索引的值。它通过递归地将索引从 0 开始递增，直到达到映射中不存在的索引为止。
参数:
Map: 枚举映射类型，键为数字，值为任意类型。
_: 一个占位符参数，用于递归中的类型参数传递，这里实际上并未使用。
Minus1: 一个辅助类型参数，用于追踪已经遍历过的索引，初始为空数组。
Index: 当前正在处理的索引，初始为 Minus1['length']，即 0。
逻辑:
如果 Minus1 不是空数组，它会解构为 _2（当前索引）和 Remain（剩余索引）。然后递归调用 EnumMapImpl，将 _2 添加到 Minus1 中，并继续处理剩余的索引。
如果 Minus1 是空数组，表示没有更多的索引要处理，递归结束。
注释掉的 Index 可能是用于直接访问 Map[Index] 的位置，但在这个实现中并未使用。

2. MapTuple
MapTuple 类型用于将 Tuple<unknown, Length> 类型（一个长度为 Length 的未知类型元组）作为参数，与 EnumMapImpl 结合使用，以生成一个基于给定枚举映射和长度的元组类型。
逻辑:
如果 T 是一个元组类型（至少有一个元素），它会使用元组的第一个元素（_1）作为递归的占位符，并将剩余的元组（Remain）作为 EnumMapImpl 的输入。
如果 T 不是元组类型，则结果为 never。

3. Tuple
Tuple 是一个递归类型，用于生成一个长度为 N 的元组，其中所有元素都是 T 类型。
参数:
T: 元组中元素的类型。
N: 元组所需的长度。
R: 当前构建的元组，初始为空数组。
逻辑:
如果 R 的长度等于 N，则递归结束，返回 R。
否则，继续递归，将 T 添加到 R 中，直到达到所需的长度。

4. MapEnum
MapEnum 类型结合了 MapTuple 和 Tuple，用于生成一个基于给定枚举映射和长度的元组类型。
逻辑:
首先，使用 Tuple<unknown, Length> 生成一个长度为 Length 的未知类型元组。
然后，将这个元组作为 MapTuple 的参数，与枚举映射 Map 结合，生成最终的元组类型。
总结
这些类型定义复杂但功能强大，它们共同工作以将一个枚举映射（Record<number, any>）转换为一个固定长度的元组类型，其中元组的每个元素都是映射中对应索引的值。这在处理具有固定数量选项的枚举或映射时非常有用。
     */