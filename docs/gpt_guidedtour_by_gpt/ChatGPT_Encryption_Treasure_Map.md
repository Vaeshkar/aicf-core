
# 🗺️ Explorer’s Guide: GPT Data Encryption on macOS

## 1. Where the Data Lives
ChatGPT stores local files in:
```
~/Library/Application Support/ChatGPT/
```
Key folders include:
- `Cache/`
- `IndexedDB/` (main conversation storage)
- `Local Storage/`

## 2. What You’ll See
- Metadata = plain text (file names, JSON fragments)
- Conversations = **encrypted blobs** (gibberish)

Check with:
```bash
cd ~/Library/Application\ Support/ChatGPT/IndexedDB
strings *.ldb | head -n 50
```

## 3. The Treasure Map

```
[ You typing in ChatGPT ]
        |
        v
 📜 Original Message
   "Hello GPT!"
        |
        v
 🔒 Encryption Chest
   Stored in ~/Library/Application Support/ChatGPT/IndexedDB
   Blob on disk: "lHnsf1DxvKkE+T3Xb2a8..."
        |
        v
 ⛓️ macOS Keychain Vault
   - Holds the AES key
   - Key tied to your macOS account
   - Protected by Secure Enclave
        |
        v
 🔑 Decryption Unlock
   App calls Keychain → gets key
   Uses it to open the chest
        |
        v
 🪙 Decrypted Treasure
   "Hello GPT!"
```

## 4. Keychain Access (Swift Example)
```swift
import Security

let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "ChatGPT",
    kSecReturnData as String: true,
    kSecMatchLimit as String: kSecMatchLimitOne
]

var item: CFTypeRef?
let status = SecItemCopyMatching(query as CFDictionary, &item)
```

## 5. Python Encryption Demo
```python
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import base64

message = "Hello GPT!"
key = get_random_bytes(16)
cipher = AES.new(key, AES.MODE_CBC)
ct_bytes = cipher.encrypt(message.encode().ljust(16))
iv = cipher.iv
encrypted_blob = base64.b64encode(iv + ct_bytes).decode("utf-8")

print("Encrypted:", encrypted_blob)

cipher_dec = AES.new(key, AES.MODE_CBC, iv)
decrypted = cipher_dec.decrypt(ct_bytes).decode("utf-8").strip()
print("Decrypted:", decrypted)
```

---

## 🏴‍☠️ Pirate Test
- Pirate copies your files → sees only encrypted blob.  
- Without your **macOS Keychain**, it’s useless.  
- With your Keychain, it’s instantly restored to your words.  

---

✅ You now hold the treasure map!
