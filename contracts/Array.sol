// SPDX-License-Identifier: CLOSED - Pending Licensing Audit
pragma solidity ^0.8.4;


library Array {

    function AddItem(bytes32 id, bytes32[] storage array) public {
        if (ContainsItem(id, array)) {
            array.push(id);
        }
    }

    function DeleteItem(bytes32 id, bytes32[] storage array) public {
        if (ContainsItem(id, array)) {
            DeleteAtIndex(IndexOf(id, array), array);
        }
    }

    function DeleteAtIndex(uint i, bytes32[] storage array) public {
        array[i] = array[array.length - 1];
        array.pop();
    }

    function ContainsItem(bytes32 id, bytes32[] memory array) private pure returns (bool seen) {
        for(uint i=0; i<array.length; i++) {
            if (array[i] == id) {
               return seen = true;
            }
        }      
    }

    function IndexOf(bytes32 id, bytes32[] memory array) private pure returns (uint index) {
        for(uint i=0; i<array.length; i++) {
            if (array[i] == id) {
               return i;
            }
        }      
    }

    /* TODO: Build delete that preserves order */

    // [0] <-- start
    // [1] <-- end    (i -1)
    // [3] <-- remove (i)
    // [4] <-- start  (i +1)
    // [5] <-- end

    // remove from start
    // [0] <-- remove (i)
    // [1] <-- start  (i +1)
    // [3] 
    // [4] 
    // [5] <-- end

    // remove from end
    // [0] <-- start
    // [1] 
    // [3] 
    // [4] <-- end    (i -1)
    // [5] <-- remove (i)

    
}