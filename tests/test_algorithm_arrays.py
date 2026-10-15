"""Small independent oracles and boundary cases for seven published answers."""

from collections import OrderedDict
from itertools import combinations, combinations_with_replacement, product
import random
import unittest

from markdown_examples import load_question


ARRAY = "algorithm/algo_array.md"


class ArrayExamples(unittest.TestCase):
    def test_q1_examples_and_duplicate_values(self):
        solve = load_question(ARRAY, 1)["twoSum"]
        for nums, target in [([2, 7, 11, 15], 9), ([3, 2, 4], 6),
                             ([3, 3], 6), ([-3, 4, 3, 90], 0), ([0, 0], 0)]:
            with self.subTest(nums=nums, target=target):
                original = nums[:]
                indices = solve(nums, target)
                self.assertEqual(len(indices), 2)
                i, j = indices
                self.assertTrue(0 <= i < len(nums) and 0 <= j < len(nums))
                self.assertNotEqual(i, j)
                self.assertEqual(nums[i] + nums[j], target)
                self.assertEqual(nums, original)

    def test_q1_small_unique_solution_inputs(self):
        solve = load_question(ARRAY, 1)["twoSum"]
        for nums in product(range(-2, 3), repeat=4):
            for target in range(-4, 5):
                pairs = [pair for pair in combinations(range(4), 2)
                         if nums[pair[0]] + nums[pair[1]] == target]
                if len(pairs) == 1:  # The stated problem guarantees one answer.
                    with self.subTest(nums=nums, target=target):
                        self.assertEqual(sorted(solve(list(nums), target)), list(pairs[0]))

    def test_q2_triplets_match_brute_force_without_duplicates(self):
        solve = load_question(ARRAY, 2)["threeSum"]
        cases = [[-1, 0, 1, 2, -1, -4], [0, 0, 0, 0], [1, 2, 3]]
        cases += [list(values) for values in combinations_with_replacement(range(-2, 3), 5)]
        for values in cases:
            with self.subTest(values=values):
                expected = {tuple(sorted(triple)) for triple in combinations(values, 3)
                            if sum(triple) == 0}
                nums = values[::-1]
                actual = solve(nums)
                self.assertTrue(all(len(triple) == 3 for triple in actual))
                self.assertEqual({tuple(sorted(triple)) for triple in actual}, expected)
                self.assertEqual(len(actual), len(expected))
                self.assertEqual(nums, sorted(values))  # Published variant sorts in place.

    def test_q5_windows_match_substring_enumeration(self):
        solve = load_question(ARRAY, 5)["lengthOfLongestSubstring"]
        cases = ["", "abcabcbb", "bbbbb", "pwwkew", "abba", "dvdf", "你好你🙂", " a a"]
        cases += ["".join(chars) for n in range(6) for chars in product("abc", repeat=n)]
        for value in cases:
            with self.subTest(value=value):
                expected = max((end - start for start in range(len(value) + 1)
                                for end in range(start, len(value) + 1)
                                if len(set(value[start:end])) == end - start), default=0)
                self.assertEqual(solve(value), expected)

    def test_q19_closed_interval_edges(self):
        solve = load_question(ARRAY, 19)["search"]
        for size in range(1, 7):
            for nums in combinations(range(-3, 4), size):
                for target in range(-4, 5):
                    with self.subTest(nums=nums, target=target):
                        expected = nums.index(target) if target in nums else -1
                        self.assertEqual(solve(list(nums), target), expected)

    def test_q21_first_last_and_absent(self):
        solve = load_question(ARRAY, 21)["searchRange"]
        for size in range(6):
            for nums in combinations_with_replacement(range(-2, 3), size):
                for target in range(-3, 4):
                    with self.subTest(nums=nums, target=target):
                        indices = [i for i, value in enumerate(nums) if value == target]
                        expected = [indices[0], indices[-1]] if indices else [-1, -1]
                        self.assertEqual(solve(list(nums), target), expected)

    def test_q22_bracket_language_matches_pair_reduction(self):
        solve = load_question(ARRAY, 22)["isValid"]
        cases = ["()[]{}", "([{}])", "([)]", "]", "((((", "}{", "(" * 1000 + ")" * 1000]
        cases += ["".join(chars) for size in range(1, 5)
                  for chars in product("()[]{}", repeat=size)]
        for value in cases:
            reduced = value
            while True:
                shorter = reduced.replace("()", "").replace("[]", "").replace("{}", "")
                if shorter == reduced:
                    break
                reduced = shorter
            with self.subTest(value=value):
                self.assertEqual(solve(value), reduced == "")


class LRUExamples(unittest.TestCase):
    def test_q58_eviction_reads_updates_and_capacity_one(self):
        cache_type = load_question("algorithm/algo_linked_design.md", 58)["LRUCache"]
        cache = cache_type(2)
        cache.put(1, 1)
        cache.put(2, 2)
        self.assertEqual(cache.get(1), 1)
        cache.put(3, 3)
        self.assertEqual(cache.get(2), -1)
        cache.put(1, 10)  # Updating an existing key also refreshes recency.
        cache.put(4, 4)
        self.assertEqual(cache.get(3), -1)
        self.assertEqual(cache.get(1), 10)
        self.assertEqual(cache.get(4), 4)
        cache = cache_type(1)
        cache.put(0, 0)
        self.assertEqual(cache.get(0), 0)
        cache.put(0, 7)
        self.assertEqual(cache.get(0), 7)
        cache.put(1, 8)
        self.assertEqual(cache.get(0), -1)
        self.assertEqual(cache.get(1), 8)

    def test_q58_operation_sequences_match_ordered_dictionary(self):
        cache_type = load_question("algorithm/algo_linked_design.md", 58)["LRUCache"]
        for capacity in (1, 2, 4):
            cache, reference = cache_type(capacity), OrderedDict()
            rng = random.Random(20261015 + capacity)
            for step in range(250):
                key = rng.randrange(8)
                with self.subTest(capacity=capacity, step=step, key=key):
                    if rng.randrange(3):
                        value = rng.randrange(100)
                        cache.put(key, value)
                        reference[key] = value
                        reference.move_to_end(key)
                        if len(reference) > capacity:
                            reference.popitem(last=False)
                    else:
                        expected = reference.get(key, -1)
                        if key in reference:
                            reference.move_to_end(key)
                        self.assertEqual(cache.get(key), expected)
            # Flush out latent wrong evictions after the operation sequence.
            for key in range(8):
                self.assertEqual(cache.get(key), reference.get(key, -1))


if __name__ == "__main__":
    unittest.main()
