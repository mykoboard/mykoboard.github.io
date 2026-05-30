import { InjectionKey } from 'vue';
import { IIdentityRepository } from './ports/IIdentityRepository';
import { ISessionRepository } from './ports/ISessionRepository';
import { IKnownIdentityRepository } from './ports/IKnownIdentityRepository';
import { ISignalingPort } from './ports/ISignalingPort';

export const IdentityRepoKey: InjectionKey<IIdentityRepository> = Symbol('IdentityRepo');
export const SessionRepoKey: InjectionKey<ISessionRepository> = Symbol('SessionRepo');
export const KnownIdentityRepoKey: InjectionKey<IKnownIdentityRepository> = Symbol('KnownIdentityRepo');
export const SignalingPortKey: InjectionKey<ISignalingPort> = Symbol('SignalingPort');
export const NetworkManagerFactoryKey: InjectionKey<(isInitiator: boolean) => import('./ports/INetworkManagerPort').INetworkManagerPort> = Symbol('NetworkManagerFactory');
export const BoardActorFactoryKey: InjectionKey<(id: string, name: string, isInitiator: boolean) => any> = Symbol('BoardActorFactory');
