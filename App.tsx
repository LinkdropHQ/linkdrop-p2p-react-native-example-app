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
const BASE_URL = Config.BASE_URL
const SENDER_PK = Config.SENDER_PK
const JSON_RPC_URL = Config.JSON_RPC_URL
const USDC_ADDRESS = Config.USDC_ADDRESS
const CHAIN_ID = Config.CHAIN_ID

const sdk = new LinkdropP2P({ apiKey: API_KEY, baseUrl: BASE_URL })
const signer = new ethers.Wallet(SENDER_PK)
const provider = new ethers.JsonRpcProvider(JSON_RPC_URL)
const wallet = new ethers.Wallet(SENDER_PK, provider)

const signTypedData = async (domain, types, message) => {
  const signature = await signer.signTypedData(domain, types, message)
  return signature
}

const sendTransaction = async ({ to, value, gasLimit, data }) => {
  const tx = await wallet.sendTransaction({ to, value, gasLimit, data })
  return { hash: tx.hash }
}

const getRandomBytes = (length) => {
  const randBytes = new Uint8Array(crypto.randomBytes(length))
  return randBytes
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
  const from = signer.address.toLowerCase() // Sender's Ethereum address
  const token = USDC_ADDRESS // token contract address
  const tokenType = "ERC20" // one of "NATIVE" | "ERC20" 
  const chainId = CHAIN_ID // network chain ID
  const expiration = String(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30); // 30 days from now

  let claimLink = await sdk.createClaimLink({ from, token, amount, expiration, chainId, tokenType })
  console.log("Claim link inited")
  console.log({ claimLink, from })
  console.log("depositing..")
  try {

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

  let claimLink = await sdk.createClaimLink({ from, token, amount, expiration, chainId, tokenType })
  console.log("Claim link inited")

  console.log("depositing..")
  try {
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

    const dest = from
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
              onPress={() => generateUSDCLink("1000000")}
            />
          </Section>
          <Section title="Generate ETH Link and claim it">
            <Button
              title="Generate ETH Link and claim"
              onPress={() => generateETHLink("1100000000000000")}
            />
          </Section>

          <Section title="Generate USDC Link, recover and claim it">
            <Button
              title="Generate USDC Link, recover and claim"
              onPress={() => generateUSDCLink("1000000", true)}
            />
          </Section>
          <Section title="Generate ETH Link, recover and claim it">
            <Button
              title="Generate ETH Link, recover and claim"
              onPress={() => generateETHLink("1100000000000000", true)}
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
