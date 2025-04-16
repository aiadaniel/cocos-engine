import { ByteBuf } from "./ByteBuf";

export interface ISerializable {
    serialize(_buf_: ByteBuf): void
    deserialize(_buf_: ByteBuf): void
}