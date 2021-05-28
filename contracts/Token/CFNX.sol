pragma solidity 0.5.16;

import "./ERC20.sol";
import "../Ownable.sol";
/**
 * @dev Example of the ERC20 Token.
 */
contract CFNX is Ownable, ERC20{
    using SafeMath for uint;

    string private _name = "CFNX";
    string private _symbol = "CFNX";

    uint8 private _decimals = 18;

    //keeo same number with FinNexus tokens totalsupply
    uint public MAX_TOTAL_TOKEN_AMOUNT = 176495407 ether;

    modifier maxTokenAmountNotReached (uint amount){
    	  assert(totalSupply().add(amount) <= MAX_TOTAL_TOKEN_AMOUNT);
    	  _;
    }

    /**
     * @return the name of the token.
     */
    function name() public view returns (string memory) {
        return _name;
    }

    /**
     * @return the symbol of the token.
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }

    /**
     * @return the number of decimals of the token.
     */
    function decimals() public view returns (uint8) {
        return _decimals;
    }


    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements
     *
     * - `to` cannot be the zero address.
     */
    function mint(address account, uint256 amount)
        public
        onlyOwner
        maxTokenAmountNotReached(amount)
    {
        _mint(account,amount);
    }

    function initialize(uint256 pmaxSupply,string memory pname, string memory psymbol)
         public
         onlyOwner
    {
            require(pmaxSupply != 0 );
            MAX_TOTAL_TOKEN_AMOUNT = pmaxSupply;
            
            if (bytes(pname).length != 0)
                _name = pname;
            
            if (bytes(psymbol).length != 0)    
                _symbol = psymbol;
    }
}