import { Address } from "../../types";
import { BlockHeightType, AddressType } from "../../actions/types/eth";

export namespace IPollCreate {
    export interface IInnerProps {
        web3: any;
    }
    
    export interface IStateFromProps {
        accountAddress: AddressType | null;
        blockHeight: BlockHeightType;
    }
}

export type IPollCreateProps = IPollCreate.IInnerProps & IPollCreate.IStateFromProps;

export interface IPollCreateStates {
    optionsAmount: number;
}
