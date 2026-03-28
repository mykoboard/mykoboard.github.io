import { InjectionKey } from 'vue';
import { IIdentityRepository } from './ports/IIdentityRepository';
import { ISessionRepository } from './ports/ISessionRepository';
import { IKnownIdentityRepository } from './ports/IKnownIdentityRepository';
import { ISignalingPort } from './ports/ISignalingPort';
import { IPeerConnectionPort } from './ports/IPeerConnectionPort';
import { Connection } from '../lib/webrtc';

export const IdentityRepoKey: InjectionKey<IIdentityRepository> = Symbol('IdentityRepo');
export const SessionRepoKey: InjectionKey<ISessionRepository> = Symbol('SessionRepo');
export const KnownIdentityRepoKey: InjectionKey<IKnownIdentityRepository> = Symbol('KnownIdentityRepo');
export const SignalingPortKey: InjectionKey<ISignalingPort> = Symbol('SignalingPort');
export const PeerConnectionFactoryKey: InjectionKey<(onSignalUpdate: (c: Connection) => void) => IPeerConnectionPort> = Symbol('PeerConnectionFactory');
export const BoardActorFactoryKey: InjectionKey<(id: string, name: string, isInitiator: boolean) => any> = Symbol('BoardActorFactory');
