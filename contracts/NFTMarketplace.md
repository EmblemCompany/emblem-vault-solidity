# NFT Marketplace

This documentation provides a user-friendly guide to interacting with a Non-Fungible Token (NFT) marketplace smart contract.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Interacting with the Marketplace](#interacting-with-the-marketplace)
4. [API Key Management](#api-key-management)
5. [Querying Offers and Configurations](#querying-offers-and-configurations)

## Introduction

The NFT Marketplace smart contract allows users to securely trade NFTs by creating and accepting offers. It supports various token standards, including ERC721 and ERC1155.

## Getting Started

### Initialize the Marketplace

Before interacting with the marketplace, it must be initialized with the following parameters:

- Payment address
- Recipient address
- New API key price

## Interacting with the Marketplace

### Add Offer

To add an offer, users must provide the following information:

- Token address
- Token ID
- NFT address
- NFT ID
- Offer amount
- API key

### Accept Offer

To accept an offer, users must provide the following information:

- Token address
- Token ID
- Offer index
- API key

### Reject Offer

To reject an offer, users must provide the following information:

- Token address
- Token ID
- Offer index

### Withdraw Offer

To withdraw an offer, users must provide the following information:

- Token address
- Token ID
- Offer index

## API Key Management

### Create New API Key

Users can create a new API key by providing the following information:

- Offer price for making offers
- Offer price for accepting offers
- Percentage fee
- Flags for toggling various features

### Change Offer Prices

API key owners can change offer prices and percentage fees by providing the following information:

- New offer price for making offers
- New offer price for accepting offers
- New percentage fee
- API key

### Toggle Features

API key owners can toggle various features, such as:

- Pay to make offer
- Pay to accept offer
- Can offer ERC20 tokens
- Take a percentage of ERC20 offers

## Querying Offers and Configurations

### Get Offer

To query a specific offer, users must provide the following information:

- Token address
- Token ID
- Offer index

### Get Config

To query a specific configuration, users must provide the following information:

- API key

### Get Offer Count

To query the number of offers for a specific NFT, users must provide the following information:

- Token address
- Token ID

### Get Accepted Offers

To query the list of accepted offers for a specific NFT, users must provide the following information:

- Token address
- Token ID

### Get Rejected Offers

To query the list of rejected offers for a specific NFT, users must provide the following information:

- Token address
- Token ID
