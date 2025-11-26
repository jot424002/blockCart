import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import "./App.css";

const CONTRACT_ADDRESS = "contact address";

const CONTRACT_ABI = ["abi here"];

const PINATA_JWT = "your api key";

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);

  const [items, setItems] = useState([]);
  const [ownedItems, setOwnedItems] = useState([]);

  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [ipfsUrl, setIpfsUrl] = useState("");

  const [status, setStatus] = useState("");

  // Initialize MetaMask + Contract
  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) {
        alert("Please install MetaMask.");
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const selected = accounts[0];

      setAccount(selected);

      const signer = provider.getSigner();
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(c);

      await loadItems(c);
      await loadOwnedItems(c, selected);

      window.ethereum.on("accountsChanged", async (accounts) => {
        if (!accounts.length) {
          setAccount("");
          setOwnedItems([]);
          return;
        }
        const newAcc = accounts[0];
        setAccount(newAcc);

        const newSigner = provider.getSigner();
        const newC = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          newSigner
        );
        setContract(newC);

        await loadItems(newC);
        await loadOwnedItems(newC, newAcc);
      });
    };

    init();
  }, []);

  // Load all items
  const loadItems = async (c) => {
    const count = (await c.itemCount()).toNumber();
    const all = [];

    for (let i = 1; i <= count; i++) {
      const item = await c.items(i);
      all.push({
        id: item.id.toNumber(),
        name: item.name,
        image: item.image,
        price: item.price,
        seller: item.seller,
        owner: item.owner,
        isSold: item.isSold,
      });
    }

    setItems(all);
  };

  // Load owned items
  const loadOwnedItems = async (c, owner) => {
    const ids = await c.getItemsByOwner(owner);
    const own = [];

    for (let idBN of ids) {
      const id = idBN.toNumber();
      const item = await c.items(id);
      own.push({
        id: item.id.toNumber(),
        name: item.name,
        image: item.image,
        price: item.price,
        seller: item.seller,
        owner: item.owner,
        isSold: item.isSold,
      });
    }

    setOwnedItems(own);
  };

  // IPFS Upload
  const uploadToIPFS = async () => {
    if (!imageFile) {
      alert("Please select an image first");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", imageFile, imageFile.name);

      const res = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${PINATA_JWT}`,
          },
        }
      );

      // ✔ FIXED — reliable gateway
      const url = `https://maroon-advanced-swordtail-764.mypinata.cloud/ipfs/${
        res.data.IpfsHash
      }?t=${Date.now()}`;
      setIpfsUrl(url);

      console.log("Uploaded URL:", url);
      alert("Image uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Image upload failed ❌");
    }
  };

  // List item
  const handleListItem = async () => {
    if (!itemName || !itemPrice || !ipfsUrl) {
      alert("Enter name, price and upload image!");
      return;
    }

    try {
      setStatus("Listing item...");
      const tx = await contract.listItem(
        itemName,
        ipfsUrl,
        ethers.utils.parseEther(itemPrice)
      );
      await tx.wait();
      setStatus("Item listed successfully!");

      setItemName("");
      setItemPrice("");
      setImageFile(null);
      setIpfsUrl("");

      await loadItems(contract);
      await loadOwnedItems(contract, account);
    } catch (e) {
      console.error(e);
      setStatus("Listing failed ❌");
    }
  };

  // Buy
  const handlePurchaseItem = async (id, priceWei) => {
    try {
      setStatus("Purchasing...");
      const tx = await contract.purchaseItem(id, { value: priceWei });
      await tx.wait();
      setStatus("Purchase successful!");

      await loadItems(contract);
      await loadOwnedItems(contract, account);
    } catch (e) {
      console.error(e);
      setStatus("Purchase failed ❌");
    }
  };

  // Transfer
  const handleTransferItem = async (id, to) => {
    if (!to) {
      alert("Enter address");
      return;
    }

    try {
      setStatus("Transferring...");
      const tx = await contract.transferItem(id, to);
      await tx.wait();
      setStatus("Transfer successful!");

      await loadItems(contract);
      await loadOwnedItems(contract, account);
    } catch (e) {
      console.error(e);
      setStatus("Transfer failed ❌");
    }
  };

  return (
    <div className="App">
      <h1>🧱 BlockCart</h1>
      {/* <p>Connected: {account}</p> */}

      <div className="list-item">
        <h2>List Item</h2>

        <input
          className="input-field"
          placeholder="Item Name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />

        <input
          className="input-field"
          placeholder="Item Price (ETH)"
          value={itemPrice}
          onChange={(e) => setItemPrice(e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          className="input-field"
          onChange={(e) => setImageFile(e.target.files[0])}
        />

        <button onClick={uploadToIPFS}>Upload Image</button>

        {ipfsUrl && (
          <p>
            IPFS:{" "}
            <a href={ipfsUrl} target="_blank" rel="noreferrer">
              {ipfsUrl}
            </a>
          </p>
        )}

        <button onClick={handleListItem}>List Item</button>
      </div>

      <p>{status}</p>

      <div className="items">
        <h2>Items for Sale</h2>

        {items
          .filter((item) => !item.isSold)
          .map((item) => (
            <div key={item.id} className="item-card">
              {item.image && (
                <img
                  src={item.image}
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/150";
                  }}
                  alt={item.name}
                  className="item-image"
                />
              )}
              <p>{item.name}</p>
              <p>{ethers.utils.formatEther(item.price)} ETH</p>

              {item.owner.toLowerCase() !== account.toLowerCase() &&
                !item.isSold && (
                  <button
                    onClick={() => handlePurchaseItem(item.id, item.price)}
                  >
                    Buy
                  </button>
                )}
            </div>
          ))}
      </div>

      <div className="owned-items">
        <h2>Your Items</h2>

        {ownedItems.map((item) => (
          <div key={item.id} className="item-card">
            {item.image && (
              <img
                src={item.image}
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/150";
                }}
                alt={item.name}
                className="item-image"
              />
            )}
            <p>{item.name}</p>

            <input
              className="input-field"
              placeholder="Transfer to address"
              onChange={(e) => (item._to = e.target.value)}
            />

            <button onClick={() => handleTransferItem(item.id, item._to)}>
              Transfer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
