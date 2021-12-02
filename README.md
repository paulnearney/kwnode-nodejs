# Kingdom.Watch Blockchain Indexing Node

### About
This script can be used for feeding interesting transactions from the blockchain to a 
[PubSub](https://cloud.google.com/pubsub) topic. The idea is to then process the transactions with 
[Cloud Functions](https://cloud.google.com/functions) and finally persisting the state in
[Firestore](https://cloud.google.com/firestore) or other suitable state stores.

This provides flexibility and let the solution scale automatically. 


### Getting started
To get started with PubSub sign up for the free tier over at [Google Cloud](https://cloud.google.com), and 
[create](https://console.cloud.google.com/cloudpubsub/topic/) a PubSub topic.

Edit `config.json` with the smart contract addresses you want to watch, as well as the PubSub topics to publish the 
transactions to.

Provide credentials for PubSub through the `ENV_NAME` environment variable.

### Future plans
Let third parties/the Community subscribe to PubSub topics, closing the gap between the blockchain and web2 tools.
