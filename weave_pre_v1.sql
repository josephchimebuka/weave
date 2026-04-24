-- Sample snapshot of pre-v1 orders for backfill
COPY public."Order" (id, "clientId", type, status, "sourceChain", "sourceToken", "sourceAmount", "fiatCurrency", "fiatAmount", "recipientBank", "recipientAccount", "recipientName", "depositAddress", "txHash", "chainrailsIntentId", "paycrestOrderId", "chainrailsRampId", "senderFeeUsd", "appFeeUsd", "bridgeFeeUsd", "createdAt", "updatedAt") FROM stdin;
ord_001_offramp1	35c381e8-adbb-4c17-8dad-1480e5c13f3c	offramp	completed	BASE	USDC	500.00	NGN	\N	GTBank	1234567890	John Doe	0x1234567890abcdef	0xabcd1234	\N	paycrest_123	\N	5.00	1.00	2.50	2026-04-23 10:30:00	2026-04-23 11:45:00
ord_002_offramp2	35c381e8-adbb-4c17-8dad-1480e5c13f3c	offramp	completed	OPTIMISM	ETH	1.50	NGN	\N	Zenith Bank	0987654321	Jane Smith	0xabcdef1234567890	0xdef56789	\N	paycrest_124	\N	3.50	0.75	1.25	2026-04-22 14:20:00	2026-04-22 16:00:00
ord_003_offramp3	35c381e8-adbb-4c17-8dad-1480e5c13f3c	offramp	processing	BASE	USDC	250.00	NGN	\N	Access Bank	5555555555	Alice Johnson	0xfedbca9876543210	0x1111aaaa	\N	paycrest_125	\N	2.50	0.50	1.00	2026-04-21 09:15:00	2026-04-21 09:30:00
ord_004_offramp4	35c381e8-adbb-4c17-8dad-1480e5c13f3c	offramp	failed	BASE	USDC	100.00	NGN	\N	UBA	3333333333	Bob Wilson	0x0000ffff	0x2222bbbb	\N	paycrest_126	\N	1.00	0.25	0.50	2026-04-20 11:00:00	2026-04-20 12:15:00
ord_005_onramp1	35c381e8-adbb-4c17-8dad-1480e5c13f3c	onramp	completed	\N	NGN	50000.00	NGN	\N	\N	\N	\N	\N	0x3333cccc	intent_cr_001	\N	\N	4.00	1.00	0.00	2026-04-19 08:45:00	2026-04-19 10:00:00
ord_006_onramp2	35c381e8-adbb-4c17-8dad-1480e5c13f3c	onramp	completed	\N	NGN	75000.00	NGN	\N	\N	\N	\N	\N	0x4444dddd	intent_cr_002	\N	\N	6.00	1.50	0.00	2026-04-18 13:30:00	2026-04-18 14:45:00
ord_007_offramp5	35c381e8-adbb-4c17-8dad-1480e5c13f3c	offramp	completed	BASE	USDC	750.00	NGN	\N	GTBank	2222222222	Charlie Brown	0xcccceeee	0x5555eeee	\N	paycrest_127	\N	7.50	1.75	3.00	2026-04-17 16:20:00	2026-04-17 17:30:00
ord_008_onramp3	35c381e8-adbb-4c17-8dad-1480e5c13f3c	onramp	processing	\N	NGN	100000.00	NGN	\N	\N	\N	\N	\N	0x6666ffff	intent_cr_003	\N	\N	10.00	2.50	0.00	2026-04-16 10:00:00	2026-04-16 10:15:00
ord_009_offramp6	35c381e8-adbb-4c17-8dad-1480e5c13f3c	offramp	completed	OPTIMISM	ETH	2.00	NGN	\N	Zenith Bank	4444444444	Diana Prince	0xdddd0000	0x7777gggg	\N	paycrest_128	\N	8.00	2.00	2.50	2026-04-15 12:45:00	2026-04-15 14:00:00
ord_010_onramp4	35c381e8-adbb-4c17-8dad-1480e5c13f3c	onramp	completed	\N	NGN	125000.00	NGN	\N	\N	\N	\N	\N	0x8888hhhh	intent_cr_004	\N	\N	12.50	3.00	0.00	2026-04-14 15:30:00	2026-04-14 16:45:00
\.
