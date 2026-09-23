/**
 * @fileoverview CaptchaController Unit Tests
 *
 * ISnakeCaptchaVerifier is fully mocked — this suite is about the
 * controller's own request-shaping/delegation, not the verifier's internal
 * logic (see SnakeCaptchaService.spec.ts for that).
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CaptchaController } from './captcha.controller'
import { ValidationError } from '../../../domain/errors/ValidationError'

const mockVerifier = {
    issueChallenge: jest.fn(),
    verifyCompletion: jest.fn(),
    verifyProof: jest.fn(),
}

const makeDto = (overrides = {}) => ({
    challengeId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    eaten: 10,
    durationMs: 18_400,
    moveCount: 27,
    ...overrides,
})

describe('CaptchaController', () => {
    let controller: CaptchaController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [CaptchaController],
            providers: [{ provide: 'ISnakeCaptchaVerifier', useValue: mockVerifier }],
        }).compile()

        controller = module.get<CaptchaController>(CaptchaController)
    })

    describe('POST /captcha/snake/challenge', () => {
        it('delegates to issueChallenge() and returns the challenge id', async () => {
            mockVerifier.issueChallenge.mockResolvedValue('new-challenge-id')

            const result = await controller.challenge()

            expect(mockVerifier.issueChallenge).toHaveBeenCalledWith()
            expect(result).toEqual({ challengeId: 'new-challenge-id' })
        })
    })

    describe('POST /captcha/snake/verify', () => {
        it('forwards the DTO to verifyCompletion() and returns the proof token on success', async () => {
            mockVerifier.verifyCompletion.mockResolvedValue('signed-proof-token')
            const dto = makeDto()

            const result = await controller.verify(dto)

            expect(mockVerifier.verifyCompletion).toHaveBeenCalledWith(dto)
            expect(result).toEqual({ proofToken: 'signed-proof-token' })
        })

        it('throws ValidationError when verifyCompletion returns null', async () => {
            mockVerifier.verifyCompletion.mockResolvedValue(null)

            await expect(controller.verify(makeDto())).rejects.toThrow(ValidationError)
        })

        it('does not leak internal verifier details in the failure message', async () => {
            mockVerifier.verifyCompletion.mockResolvedValue(null)

            let caught: ValidationError | undefined
            try {
                await controller.verify(makeDto())
            } catch (e) {
                caught = e as ValidationError
            }

            expect(caught).toBeInstanceOf(ValidationError)
            expect(caught!.message).toBe('Snake captcha verification failed — play the game again.')
        })
    })
})
