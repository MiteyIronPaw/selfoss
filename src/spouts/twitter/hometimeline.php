<?php

// SPDX-FileCopyrightText: 2011–2013 Tobias Zeising <tobias.zeising@aditu.de>
// SPDX-FileCopyrightText: 2013 Tim Gerundt <tim@gerundt.de>
// SPDX-FileCopyrightText: 2017–2023 Jan Tojnar <jtojnar@gmail.com>
// SPDX-FileCopyrightText: 2018 Binnette <binnette@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

declare(strict_types=1);

namespace spouts\twitter;

use spouts\Item;
use spouts\Parameter;

/**
 * Spout for fetching the twitter timeline of your twitter account
 *
 * @extends \spouts\spout<null>
 */
class hometimeline extends \spouts\spout {
    public string $name = 'Twitter: your timeline';

    public string $description = 'Fetch your twitter timeline.';

    public array $params = [
        'consumer_key' => [
            'title' => 'Consumer Key',
            'type' => Parameter::TYPE_TEXT,
            'default' => '',
            'required' => true,
            'validation' => [Parameter::VALIDATION_NONEMPTY],
        ],
        'consumer_secret' => [
            'title' => 'Consumer Secret',
            'type' => Parameter::TYPE_PASSWORD,
            'default' => '',
            'required' => true,
            'validation' => [Parameter::VALIDATION_NONEMPTY],
        ],
        'access_key' => [
            'title' => 'Access Key',
            'type' => Parameter::TYPE_PASSWORD,
            'default' => '',
            'required' => true,
            'validation' => [Parameter::VALIDATION_NONEMPTY],
        ],
        'access_secret' => [
            'title' => 'Access Secret',
            'type' => Parameter::TYPE_PASSWORD,
            'default' => '',
            'required' => true,
            'validation' => [Parameter::VALIDATION_NONEMPTY],
        ],
    ];

    /** URL of the source */
    private string $htmlUrl = '';

    /** Title of the source */
    private ?string $title = null;

    /** @var iterable<Item<null>> current fetched items */
    private iterable $items = [];

    private TwitterV1ApiClientFactory $clientFactory;

    public function __construct(TwitterV1ApiClientFactory $clientFactory) {
        $this->clientFactory = $clientFactory;
    }

    /**
     * @param array{consumer_key: string, consumer_secret: string, access_key: string, access_secret: string} $params
     */
    public function load(array $params): void {
        $client = $this->clientFactory->create(
            $params['consumer_key'],
            $params['consumer_secret'],
            $params['access_key'],
            $params['access_secret']
        );

        $this->items = $client->fetchTimeline('statuses/home_timeline');

        $this->htmlUrl = 'https://twitter.com/';

        $this->title = 'Home timeline';
    }

    public function getTitle(): ?string {
        return $this->title;
    }

    public function getHtmlUrl(): ?string {
        return $this->htmlUrl;
    }

    /**
     * @return iterable<Item<null>> list of items
     */
    public function getItems(): iterable {
        return $this->items;
    }

    public function destroy(): void {
        unset($this->items);
        $this->items = [];
    }
}
