import type { ParseFailure } from '@lemons_dev/parsinom/lib/HelperTypes';

/// <reference types="astro/client" />
declare namespace App {
	interface Locals {
		error?: ParseFailure;
	}
}
