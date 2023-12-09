/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  FlatList,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Button
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

import Config from './config.json'
import crypto from 'react-native-quick-crypto';
import { ethers } from "ethers";

import { LinkdropP2P } from 'linkdrop-p2p-sdk'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function Section({ children, title }: SectionProps): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

const API_KEY = Config.API_KEY
//const API_URL = "http://localhost:3015"
const BASE_URL = Config.BASE_URL
const SENDER_PK = Config.SENDER_PK
const JSON_RPC_URL = Config.JSON_RPC_URL
const USDC_ADDRESS = Config.USDC_ADDRESS
const CHAIN_ID = Config.CHAIN_ID

const getRandomBytes = (length) => {
  const randBytes = new Uint8Array(crypto.randomBytes(length))
  return randBytes
}
const sdk = new LinkdropP2P({ apiKey: API_KEY, baseUrl: BASE_URL, getRandomBytes })
//const sdk = {}
//const ethers = {}
const signer = new ethers.Wallet(SENDER_PK)
const provider = new ethers.JsonRpcProvider(JSON_RPC_URL)
const wallet = new ethers.Wallet(SENDER_PK, provider)

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)"
];

const signTypedData = async (domain, types, message) => {
  console.log({ domain, types, message })
  const signature = await signer.signTypedData(domain, types, message)
  console.log({ signature })
  return signature
}

const sendTransaction = async ({ to, value, gasLimit, data }) => {
  console.log({ value })
  const tx = await wallet.sendTransaction({ to, value, gasLimit, data })
  return { hash: tx.hash }
}

const redeem = async (url, dest) => {
  console.log(`Redeeming url: ${url}`)
  const claimLinkToRedeem = await sdk.getClaimLink(url)
  console.log(claimLinkToRedeem)
  console.log("redeeming..")
  const redeemTxHash = await claimLinkToRedeem.redeem(dest)
  console.log({ redeemTxHash })
  let confirmed = false
  while (!confirmed) {
    const { status, operations } = await claimLinkToRedeem.getStatus()
    console.log({ status, operations })
    confirmed = status == "redeemed"
    if (!confirmed) {
      await sleep(1000)
    }
  }
}

const generateUSDCLink = async (amount, recover = false) => {
  try {
    const from = signer.address.toLowerCase() // Sender's Ethereum address
    const token = USDC_ADDRESS // token contract address
    const tokenType = "ERC20" // one of "NATIVE" | "ERC20" 
    const chainId = CHAIN_ID // network chain ID
    const expiration = String(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30); // 30 days from now

    const limits = await sdk.getLimits({ token, tokenType: "ERC20", chainId })
    console.log({ limits })

    let claimLink = await sdk.createClaimLink({ from, token, amount, expiration, chainId, tokenType })
    console.log("Claim link inited")
    console.log({ claimLink, from })

    const { minTransferAmount, maxTransferAmount } = await sdk.getLimits({ token, chainId, tokenType })
    console.log({ minTransferAmount, maxTransferAmount })
    console.log("depositing..")


    let { claimUrl, transferId, txHash } = await claimLink.depositWithAuthorization({ signTypedData, getRandomBytes })
    console.log({ txHash, claimUrl, transferId })
    if (recover) {
      console.log("Recovering claim URL")
      claimLink = await sdk.retrieveClaimLink({ chainId, txHash: txHash.toLowerCase() })
      console.log({ claimLink })

      const { claimUrl: newClaimUrl, transferId: newTransferId } = await claimLink.generateClaimUrl({ signTypedData, getRandomBytes })
      console.log({ newClaimUrl, newTransferId })
      claimUrl = newClaimUrl
    }

    let confirmed = false
    while (!confirmed) {
      const { status, operations } = await claimLink.getStatus()
      console.log({ status, operations })
      confirmed = status == "deposited"
      if (!confirmed) {
        await sleep(1000)
      }
    }

    console.log("confirmed deposited")
    const dest = from
    await redeem(claimUrl, dest)

    const {
      claimLinks, // claim links fetched according to search parameters
      resultSet // information about fetched data (count, offset, total)
    } = await sdk.getSenderHistory({
      //onlyActive: true,
      chainId,
      sender: from,
      //token
      // tokenAddress: ethers.ZeroAddress
    })


    console.log({ claimLinks, resultSet })
    const cc = claimLinks[0]
    console.log(claimLinks)

    const ccRet = await sdk.retrieveClaimLink({ chainId, sender: from, transferId: cc.transferId })
    console.log("-------:")
    console.log(ccRet)

  } catch (err) {
    console.log("error:")
    console.log(err)
    throw new Error("Error while testing")
  }
}

const generateStablecoinLink = async (amount, recover = false) => {
  try {
    const from = signer.address.toLowerCase() // Sender's Ethereum address
    const token = USDC_ADDRESS // token contract address
    const tokenType = "ERC20" // one of "NATIVE" | "ERC20" 
    const chainId = CHAIN_ID // network chain ID
    const expiration = String(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30); // 30 days from now

    const limits = await sdk.getLimits({ token, tokenType: "ERC20", chainId })
    console.log({ limits })

    let claimLink = await sdk.createClaimLink({ from, token, amount, expiration, chainId, tokenType })
    console.log("Claim link inited")
    console.log({ claimLink, from })

    const { minTransferAmount, maxTransferAmount } = await sdk.getLimits({ token, chainId, tokenType })
    console.log({ minTransferAmount, maxTransferAmount })

    console.log("approving escrow contract...")

    // Create an instance of the contract
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);

    // Create the transaction
    const tx = await usdcContract.approve(claimLink.escrowAddress, claimLink.totalAmount);
    console.log(`Approve tx hash: ${tx.hash}`)
    await tx.wait()

    console.log("depositing..")


    let { claimUrl, transferId, txHash } = await claimLink.deposit({ sendTransaction, getRandomBytes })
    console.log({ txHash, claimUrl, transferId })
    if (recover) {
      console.log("Recovering claim URL")
      claimLink = await sdk.retrieveClaimLink({ chainId, txHash: txHash.toLowerCase() })
      console.log({ claimLink })

      const { claimUrl: newClaimUrl, transferId: newTransferId } = await claimLink.generateClaimUrl({ signTypedData, getRandomBytes })
      console.log({ newClaimUrl, newTransferId })
      claimUrl = newClaimUrl
    }

    let confirmed = false
    while (!confirmed) {
      const { status, operations } = await claimLink.getStatus()
      console.log({ status, operations })
      confirmed = status == "deposited"
      if (!confirmed) {
        await sleep(1000)
      }
    }

    console.log("confirmed deposited")
    await sleep(10000)
    const dest = from
    await redeem(claimUrl, dest)



    const {
      claimLinks, // claim links fetched according to search parameters
      resultSet // information about fetched data (count, offset, total)
    } = await sdk.getSenderHistory({
      //onlyActive: true,
      chainId,
      sender: from,
      //token
      // tokenAddress: ethers.ZeroAddress
    })


    console.log({ claimLinks, resultSet })
    const cc = claimLinks[0]
    console.log(claimLinks)

    const ccRet = await sdk.retrieveClaimLink({ chainId, sender: from, transferId: cc.transferId })
    //console.log(cc.operations)
    console.log("-------:")
    console.log(ccRet)


    /* const block = await provider.getBlock(50052559)
     * console.log({ block }) */

  } catch (err) {
    console.log("error:")
    console.log(err)
    throw new Error("Error while testing")
  }
}



const generateETHLink = async (amount, recover = false) => {
  const from = signer.address.toLowerCase()
  const token = ethers.ZeroAddress // token contract address
  const tokenType = "NATIVE" // one of "NATIVE" | "ERC20" 
  const chainId = CHAIN_ID // network chain ID
  const expiration = String(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30); //30 days from now
  try {
    let claimLink = await sdk.createClaimLink({ from, token, amount, expiration, chainId, tokenType })
    console.log("Claim link inited")

    console.log({ claimLink })

    //const res = await claimLink.updateAmount("10000000000000000")
    //console.log({ res })

    console.log("depositing..")

    let { claimUrl, transferId, txHash } = await claimLink.deposit({ sendTransaction, getRandomBytes })
    console.log({ txHash, claimUrl, transferId })

    // regenerating link 
    if (recover) {
      console.log("Recovering claim URL")
      claimLink = await sdk.retrieveClaimLink({ chainId, txHash })
      console.log({ claimLink })
      let { claimUrl: newClaimUrl, transferId: newTransferId } = await claimLink.generateClaimUrl({ signTypedData, getRandomBytes })
      console.log({ newClaimUrl, newTransferId })
      claimUrl = newClaimUrl
    }



    let confirmed = false
    while (!confirmed) {
      const { status, operations } = await claimLink.getStatus()
      console.log({ status, operations })
      confirmed = status == "deposited"
      if (!confirmed) {
        await sleep(1000)
      }
    }

    console.log("confirmed deposited")
    await sleep(10000)


    const dest = from
    // const claimUrl = "https://cb.linkdrop.io/#/matic?k=78DdpBKAdu6m8KA9TvSYsUjTUE87S3wbnccCimEGeEQD&s=4ERZxxdBnFj1PV2pTdzyp51UugLN&c=137&v=2"
    await redeem(claimUrl, dest)
  } catch (err) {
    console.log("error:")
    console.log(err)
    throw new Error("Error while testing")
  }
}


function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  return (
    <SafeAreaView style={backgroundStyle}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Section title="Generate USDC Link and claim it">
            <Button
              title="Generate USDC Link and claim"
              onPress={() => generateUSDCLink("150001")}
            />
          </Section>
          <Section title="Generate USDC Link, recover and claim it">
            <Button
              title="Generate USDC Link, recover and claim"
              onPress={() => generateUSDCLink("1000000", true)}
            />
          </Section>

          <Section title="Generate stablecoin Link and claim it">
            <Button
              title="Generate Stablecoin Link and claim"
              onPress={() => generateStablecoinLink("150000")}
            />
          </Section>
          <Section title="Generate Stablecoin Link, recover and claim it">
            <Button
              title="Generate Stablecoin Link, recover and claim"
              onPress={() => generateStablecoinLink("1000000", true)}
            />
          </Section>


          <Section title="Generate ETH Link and claim it">
            <Button
              title="Generate ETH Link and claim"
              onPress={() => generateETHLink("20000000000000000")}
            />
          </Section>

          <Section title="Generate ETH Link, recover and claim it">
            <Button
              title="Generate ETH Link, recover and claim"
              onPress={() => generateETHLink("10000000000000000", true)}
            />
          </Section>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
