# WhatsApp-Style Multi-Device End-to-End Encrypted Messaging System

## Table of Contents

* [Overview](#overview)
* [Key Features](#key-features)
* [Encryption Architecture](#encryption-architecture)
* [Multi-Device Design](#multi-device-design)
* [Client Logic](#client-logic)
* [Storage Rules](#storage-rules)
* [System Architecture](#system-architecture)
* [Tech Stack](#tech-stack)
* [Security Guarantees](#security-guarantees)
* [Failure & Recovery Model](#failure--recovery-model)
* [Interview Highlights](#interview-highlights)

---

## Overview

This project is a **WhatsApp-like real-time messaging system** implementing **true end-to-end encryption (E2EE)** with **multi-device synchronization**.

The system ensures:

* Messages are encrypted **before leaving the device**
* The server **never sees plaintext**
* Each device is treated as a **separate cryptographic identity**
* Secure key re-sharing when new devices are linked

The architecture closely mirrors real-world systems used by WhatsApp and Signal, focusing on **cryptographic correctness, scalability, and fault tolerance**.

---

## Key Features

### 1. End-to-End Encrypted Messaging 🔐

* AES-GCM symmetric encryption for message payloads
* Per-conversation **single ChatKey**
* Unique IV generated per message
* Server stores **ciphertext only**

### 2. True Multi-Device Support 📱💻

* Each device has its **own public/private keypair**
* Chat keys encrypted **independently per device**
* Secure device linking without server decryption
* Seamless message sync across devices

### 3. Real-Time Messaging ⚡

* WebSocket-based delivery
* Supabase Realtime for live updates
* Offline reconciliation on reconnect
* Delivery acknowledgements and retries

---

## Encryption Architecture

### Core Principles

1. Every device generates its **own asymmetric keypair**
2. **Private keys never leave the device**
3. Server stores **public keys only**
4. Each chat has **one symmetric ChatKey**
5. Messages are encrypted using **AES-GCM(ChatKey)**
6. ChatKey is encrypted **once per device** using device public keys
7. Server never decrypts messages or keys

---

### Message Encryption Flow

```
Plaintext Message
        ↓
Encrypt(Message, ChatKey, IV)
        ↓
Ciphertext + IV
        ↓
Server Storage (No Plaintext)
```

---

### ChatKey Encryption (Per Device)

```
Encrypt(ChatKey, DeviceA_PublicKey)
Encrypt(ChatKey, DeviceB_PublicKey)
```

The server stores **multiple encrypted copies** of the same ChatKey — one per device.

---

## Multi-Device Design

### Device Linking Flow

1. New device generates a keypair
2. Public key uploaded to server
3. Server notifies existing devices
4. Existing device encrypts ChatKey using new device’s public key
5. Encrypted ChatKey uploaded to server
6. New device downloads encrypted ChatKey
7. New device decrypts ChatKey locally
8. Full chat history becomes readable


---

## Client Logic

### On Login

* Fetch encrypted ChatKeys for device
* Decrypt ChatKeys using private key
* Store decrypted ChatKeys in memory

### Sending Messages

* Encrypt message with ChatKey
* Send ciphertext + IV

### Receiving Messages

* Subscribe to realtime channel
* Decrypt messages locally using ChatKey

---

## Storage Rules

### Client (Device)

* Private keys → Encrypted IndexedDB
* Decrypted ChatKeys → Memory only
* Messages → Decrypted in runtime

### Server

* Public keys → Database
* Encrypted ChatKeys → Per device
* Messages → Ciphertext + metadata only

---

## System Architecture

### Core Services

* **WebSocket Gateway** – realtime messaging
* **Message Service** – stateless write path
* **Presence Service** – online / typing state
* **Media Service** – S3 + CDN for attachments
* **Notification Service** – background delivery

---

### Infrastructure Concepts Applied

* Kafka → message event stream
* RabbitMQ → delivery acknowledgements
* Redis → online presence, typing indicators
* CQRS → optimized reads vs writes
* Rate limiting → spam protection
* Prometheus → message latency metrics

---

## Tech Stack

### Frontend

* React / Next.js
* TypeScript
* IndexedDB (secure key storage)
* WebCrypto API (AES-GCM, RSA/ECDH)
* WebSockets

### Backend

* Node.js
* Supabase Realtime
* PostgreSQL
* Redis
* Kafka / RabbitMQ
* AWS S3 + CDN

---

## Security Guarantees

* Server cannot read messages
* Compromised database exposes only ciphertext
* Device-level isolation
* Forward secrecy at conversation level
* Replay-safe encryption using per-message IVs

---

## Failure & Recovery Model

### Device Loss

* Private key lost → messages unreadable
* Requires device re-linking
* ChatKeys must be re-shared

### Network Failure

* Messages queued and replayed
* Ordering preserved on reconnect
* At-least-once delivery guarantee

