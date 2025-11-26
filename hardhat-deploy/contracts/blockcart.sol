// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract blockCart {
    struct Item {
        uint id;
        string name;
        string image;  // ⭐ IPFS image URL
        uint price;
        address payable seller;
        address owner;
        bool isSold;
    }

    uint public itemCount = 0;
    mapping(uint => Item) public items;
    mapping(address => uint[]) public ownedItems;

    function listItem(string memory _name, string memory _image, uint _price) public {
        require(_price > 0, "Price must be greater than 0!");
        require(bytes(_image).length > 0, "Image URL required!");

        itemCount++; 
        items[itemCount] = Item(
            itemCount,
            _name,
            _image,
            _price,
            payable(msg.sender),
            msg.sender,
            false
        );
        ownedItems[msg.sender].push(itemCount);
    }

    function purchaseItem(uint _id) public payable {
        Item storage item = items[_id];
        require(_id > 0 && _id <= itemCount, "Invalid ID!");
        require(msg.value == item.price, "Incorrect price");
        require(!item.isSold, "Item already sold");
        require(msg.sender != item.seller, "Seller cannot buy their own items"); 

        item.isSold = true;
        item.seller.transfer(msg.value);
        _transferOwnership(_id, item.seller, msg.sender);
    }

    function _transferOwnership(uint _id, address _from, address _to) internal {
        Item storage item = items[_id];
        item.owner = _to;

        uint[] storage fromItems = ownedItems[_from];
        for (uint i = 0; i < fromItems.length; i++) {
            if (fromItems[i] == _id) {
                fromItems[i] = fromItems[fromItems.length - 1];
                fromItems.pop();
                break;
            }
        }

        ownedItems[_to].push(_id);
    }

    function transferItem(uint _id, address _to) public {
        Item storage item = items[_id];
        require(_id > 0 && _id <= itemCount, "Item does not exist");
        require(msg.sender == item.owner, "You are not the owner of this item");
        _transferOwnership(_id, msg.sender, _to);
    }

    function getItemsByOwner(address _owner) public view returns (uint[] memory) {
        return ownedItems[_owner];
    }
}
